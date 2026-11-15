<?php
/* =====================================================================
   BIBOULAB — envoi du formulaire de contact par e-mail (côté serveur)
   Reçoit le formulaire de contact.html et l'envoie à la boîte de
   l'entreprise, sans ouvrir la messagerie du visiteur.
   Nécessite PHP + la fonction mail() (fournie par O2switch).
   ===================================================================== */

const DESTINATAIRE = 'biboulab@outlook.fr';   // boîte qui reçoit les messages
const EXPEDITEUR   = 'no-reply@biboulab.fr';  // doit être une adresse du domaine du site
const NOM_SITE     = 'Biboulab';
const MAX_PAR_HEURE = 5;                       // anti-spam : messages max par visiteur et par heure

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function reponse(int $code, bool $ok, string $erreur = ''): never {
    http_response_code($code);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'erreur' => $erreur]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') reponse(405, false, 'Méthode non autorisée.');

/* Champ piège invisible : un robot le remplit, un humain non. */
if (trim((string)($_POST['site_web'] ?? '')) !== '') reponse(200, true);

/* Nettoie une valeur : supprime les retours à la ligne (anti-injection d'en-têtes) */
function ligne(string $v, int $max): string {
    $v = preg_replace('/[\r\n\t]+/', ' ', $v);
    return trim(mb_substr($v, 0, $max));
}
function texte(string $v, int $max): string {
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return trim(mb_substr($v, 0, $max));
}

$prenom  = ligne((string)($_POST['prenom'] ?? ''), 100);
$nom     = ligne((string)($_POST['nom'] ?? ''), 100);
$complet = trim("$prenom $nom");
$email   = ligne((string)($_POST['email'] ?? ''), 150);
$message = texte((string)($_POST['message'] ?? ''), 5000);
$perso   = !empty($_POST['personnalisation']);
$dim     = ligne((string)($_POST['dimensions'] ?? ''), 100);
$couleur = ligne((string)($_POST['couleur'] ?? ''), 100);

if ($prenom === '' || $nom === '' || $message === '' || empty($_POST['accord'])) reponse(422, false, 'Champs obligatoires manquants.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) reponse(422, false, 'Adresse e-mail invalide.');

/* Limite par visiteur (fichier temporaire, par adresse IP) */
$cle = sys_get_temp_dir() . '/biboulab-contact-' . md5($_SERVER['REMOTE_ADDR'] ?? 'x');
$maintenant = time();
$envois = [];
if (is_file($cle)) {
    $envois = array_filter(array_map('intval', file($cle, FILE_IGNORE_NEW_LINES) ?: []), fn($t) => $t > $maintenant - 3600);
}
if (count($envois) >= MAX_PAR_HEURE) reponse(429, false, 'Trop de messages envoyés. Réessayez plus tard.');

$sujet = ($perso ? 'Demande de personnalisation' : 'Message') . ' — ' . $complet;
$corps = "Nouveau message depuis le site " . NOM_SITE . "\n\n"
       . "Prénom : $prenom\nNom : $nom\nE-mail : $email\n"
       . ($perso ? "Type : demande de personnalisation\nDimensions : " . ($dim ?: '—') . "\nCouleur : " . ($couleur ?: '—') . "\n" : '')
       . "\nMessage :\n$message\n";

$entetes = [
    'From' => NOM_SITE . ' <' . EXPEDITEUR . '>',
    'Reply-To' => mb_encode_mimeheader($complet, 'UTF-8') . " <$email>",
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'X-Mailer' => 'PHP/' . PHP_VERSION,
];
$envoye = mail(
    DESTINATAIRE,
    mb_encode_mimeheader($sujet, 'UTF-8'),
    $corps,
    $entetes,
    '-f' . EXPEDITEUR
);
if (!$envoye) reponse(500, false, "L'envoi a échoué.");

$envois[] = $maintenant;
@file_put_contents($cle, implode("\n", $envois));
reponse(200, true);
