<?php
/* =====================================================================
   BIBOULAB — RÉCEPTION DES COMMANDES (hébergement O2switch, PHP 7.4 ou plus)
   ---------------------------------------------------------------------
   POST                       depuis le panier du site : enregistre la
                              commande et prévient l'atelier par e-mail.
   GET   + en-tête X-Cle      depuis la page de gestion (outils/) : liste
                              des commandes en attente.
   POST ?action=accuse + clé  la page de gestion confirme les avoir
                              récupérées : elles sont effacées du serveur.

   Les commandes sont rangées EN DEHORS du dossier public du site
   (…/commandes-biboulab/), ou à défaut dans api/donnees/, que le fichier
   api/.htaccess rend inaccessible depuis le web.
   La clé n'est jamais dans le dépôt : le déploiement GitHub écrit son
   empreinte dans api/cle.php à partir du secret CLE_COMMANDES.
   ===================================================================== */
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('X-Robots-Tag: noindex');

const MAX_PAR_HEURE = 6; // commandes acceptées par adresse IP et par heure

function reponse(int $code, array $donnees): void {
  http_response_code($code);
  echo json_encode($donnees, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

/* Dossier des commandes : hors du site si possible */
function dossier(): string {
  foreach ([dirname(__DIR__, 2) . '/commandes-biboulab', __DIR__ . '/donnees'] as $d) {
    if ((is_dir($d) || @mkdir($d, 0700, true)) && is_writable($d)) return $d;
  }
  reponse(500, ['erreur' => "Le serveur ne peut pas enregistrer la commande. Réessayez plus tard ou écrivez-moi par e-mail."]);
  return '';
}

function texte($v, int $max): string {
  $v = is_scalar($v) ? (string) $v : '';
  $v = preg_replace('/[\x00-\x09\x0B-\x1F\x7F]/u', '', $v) ?? ''; // caractères de contrôle (et UTF-8 invalide)
  return mb_substr(trim($v), 0, $max);
}
function ligne($v, int $max): string { return str_replace("\n", ' ', texte($v, $max)); }
function nombre($v, float $min, float $max): float {
  $n = is_numeric($v) ? (float) $v : 0.0;
  return round(max($min, min($max, $n)), 2);
}
function euros(float $n): string { return number_format($n, 2, ',', ' ') . ' €'; }

function cleValide(): bool {
  $fichier = __DIR__ . '/cle.php';
  if (!is_file($fichier)) reponse(503, ['erreur' => "La clé de la page de gestion n'est pas installée sur le site (secret CLE_COMMANDES)."]);
  $empreinte = (string) (include $fichier);
  $cle = (string) ($_SERVER['HTTP_X_CLE'] ?? '');
  return $cle !== '' && strlen($empreinte) === 64 && hash_equals($empreinte, hash('sha256', $cle));
}

/* Limite le nombre de commandes par visiteur (protection contre les robots) */
function limiter(string $dir): void {
  $f = $dir . '/limites.json';
  $h = fopen($f, 'c+');
  if (!$h) return;
  flock($h, LOCK_EX);
  $vus = json_decode((string) stream_get_contents($h), true) ?: [];
  $ip = hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . '|biboulab');
  $maintenant = time();
  foreach ($vus as $k => $t) { $vus[$k] = array_values(array_filter((array) $t, function ($x) use ($maintenant) { return $x > $maintenant - 3600; })); if (!$vus[$k]) unset($vus[$k]); }
  $trop = count($vus[$ip] ?? []) >= MAX_PAR_HEURE;
  if (!$trop) $vus[$ip][] = $maintenant;
  ftruncate($h, 0); rewind($h); fwrite($h, json_encode($vus)); fflush($h);
  flock($h, LOCK_UN); fclose($h);
  if ($trop) reponse(429, ['erreur' => "Trop de commandes envoyées en peu de temps. Réessayez dans une heure ou écrivez-moi par e-mail."]);
}

/* Adresse de l'atelier : SITE.email dans assets/js/data.js */
function emailAtelier(): string {
  $data = @file_get_contents(dirname(__DIR__) . '/assets/js/data.js');
  if ($data && preg_match('/^\s*email:\s*"([^"]+)"/m', $data, $m) && filter_var($m[1], FILTER_VALIDATE_EMAIL) && strpos($m[1], 'votre-domaine') === false) return $m[1];
  return '';
}

function prevenir(array $c): void {
  $a = emailAtelier();
  if (!$a) return;
  $hote = preg_replace('/[^a-z0-9.-]/', '', strtolower((string) ($_SERVER['SERVER_NAME'] ?? 'localhost'))) ?: 'localhost';
  $hote = preg_replace('/^www\./', '', $hote);
  $l = $c['livraison'];
  $corps = array_merge(
    ["Nouvelle commande {$c['ref']} reçue sur le site.", '', 'Elle vous attend dans la page de gestion, onglet Commandes (bouton « Récupérer les commandes du site »).', ''],
    array_map(function ($x) { return "- {$x['qte']} × {$x['nom']}" . (($o = implode(' · ', array_filter([$x['couleurNom'], $x['taille']]))) ? " ($o)" : '') . ' : ' . euros($x['qte'] * $x['prix']); }, $c['articles']),
    ['', 'Livraison (' . $l['nom'] . ') : ' . ($l['frais'] ? euros($l['frais']) : 'offerte'), 'TOTAL annoncé : ' . euros($c['total']), '',
     'Paiement souhaité : ' . $c['paiement']['nom'], '', 'Client :', $c['client']['prenom'] . ' ' . $c['client']['nom'], $c['client']['adresse'],
     $c['client']['cp'] . ' ' . $c['client']['ville'], $c['client']['email']],
    $c['note'] !== '' ? ['', 'Précision : ' . $c['note']] : []
  );
  $sujet = '=?UTF-8?B?' . base64_encode("Nouvelle commande {$c['ref']}") . '?=';
  $entetes = implode("\r\n", ["From: Biboulab <ne-pas-repondre@$hote>", 'Reply-To: ' . $c['client']['email'], 'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit']);
  @mail($a, $sujet, implode("\n", $corps), $entetes);
}

$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

/* ---------- Page de gestion : liste des commandes en attente ---------- */
if ($methode === 'GET') {
  if (!cleValide()) reponse(401, ['erreur' => 'Clé refusée.']);
  $dir = dossier();
  $liste = [];
  foreach (glob($dir . '/GF-*.json') ?: [] as $f) { $c = json_decode((string) file_get_contents($f), true); if (is_array($c)) $liste[] = $c; }
  usort($liste, function ($a, $b) { return strcmp($a['recue'] ?? '', $b['recue'] ?? ''); });
  reponse(200, ['commandes' => $liste]);
}
if ($methode !== 'POST') reponse(405, ['erreur' => 'Méthode non prise en charge.']);

$brut = (string) file_get_contents('php://input', false, null, 0, 40000);
if (strlen($brut) >= 40000) reponse(413, ['erreur' => 'Commande trop volumineuse.']);
$d = json_decode($brut, true);
if (!is_array($d)) reponse(400, ['erreur' => 'Commande illisible.']);

/* ---------- Page de gestion : commandes bien récupérées, on les efface ---------- */
if ($action === 'accuse') {
  if (!cleValide()) reponse(401, ['erreur' => 'Clé refusée.']);
  $dir = dossier(); $n = 0;
  foreach ((array) ($d['refs'] ?? []) as $ref) {
    if (is_string($ref) && preg_match('/^GF-[A-Z0-9-]{4,24}$/', $ref) && is_file("$dir/$ref.json")) $n += (int) unlink("$dir/$ref.json");
  }
  reponse(200, ['ok' => true, 'effacees' => $n]);
}

/* ---------- Panier du site : nouvelle commande ---------- */
$cl = is_array($d['client'] ?? null) ? $d['client'] : [];
$client = [
  'prenom' => ligne($cl['prenom'] ?? '', 60), 'nom' => ligne($cl['nom'] ?? '', 60),
  'email' => ligne($cl['email'] ?? '', 120), 'adresse' => ligne($cl['adresse'] ?? '', 160),
  'cp' => ligne($cl['cp'] ?? '', 10), 'ville' => ligne($cl['ville'] ?? '', 80)
];
if (!$client['prenom'] || !$client['nom'] || !$client['adresse'] || !$client['ville']) reponse(400, ['erreur' => 'Adresse de livraison incomplète.']);
if (!filter_var($client['email'], FILTER_VALIDATE_EMAIL)) reponse(400, ['erreur' => "L'adresse e-mail n'est pas valide."]);
if (!preg_match('/^\d{5}$/', $client['cp'])) reponse(400, ['erreur' => "Le code postal n'est pas valide."]);

$articles = [];
foreach (array_slice((array) ($d['articles'] ?? []), 0, 50) as $x) {
  if (!is_array($x)) continue;
  $id = ligne($x['id'] ?? '', 80);
  $couleur = ligne($x['couleur'] ?? '', 30);
  $articles[] = [
    'id' => preg_match('/^[a-z0-9-]+$/', $id) ? $id : '', 'nom' => ligne($x['nom'] ?? '', 120),
    'couleur' => preg_match('/^[a-z0-9-]*$/', $couleur) ? $couleur : '', 'couleurNom' => ligne($x['couleurNom'] ?? '', 40),
    'taille' => ligne($x['taille'] ?? '', 40), 'qte' => (int) nombre($x['qte'] ?? 1, 1, 99), 'prix' => nombre($x['prix'] ?? 0, 0, 10000)
  ];
}
$articles = array_values(array_filter($articles, function ($x) { return $x['nom'] !== ''; }));
if (!$articles) reponse(400, ['erreur' => 'Le panier est vide.']);

$dir = dossier();
limiter($dir);

$ref = strtoupper(ligne($d['ref'] ?? '', 24));
if (!preg_match('/^GF-[A-Z0-9]{4,12}$/', $ref)) $ref = 'GF-' . strtoupper(base_convert((string) time(), 10, 36));
while (is_file("$dir/$ref.json")) $ref = preg_replace('/-[A-Z0-9]{2}$/', '', $ref) . '-' . strtoupper(bin2hex(random_bytes(1))); // référence déjà prise

$liv = is_array($d['livraison'] ?? null) ? $d['livraison'] : [];
$pay = is_array($d['paiement'] ?? null) ? $d['paiement'] : [];
$commande = [
  'ref' => $ref, 'recue' => date('c'), 'client' => $client, 'articles' => $articles,
  'livraison' => ['id' => ligne($liv['id'] ?? '', 30), 'nom' => ligne($liv['nom'] ?? '', 80), 'frais' => nombre($liv['frais'] ?? 0, 0, 1000)],
  'paiement' => ['id' => ligne($pay['id'] ?? '', 30), 'nom' => ligne($pay['nom'] ?? '', 80)],
  'total' => nombre($d['total'] ?? 0, 0, 1000000), 'note' => texte($d['note'] ?? '', 500)
];
$tmp = "$dir/$ref.json.tmp";
if (file_put_contents($tmp, json_encode($commande, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT)) === false || !rename($tmp, "$dir/$ref.json")) {
  reponse(500, ['erreur' => "Le serveur ne peut pas enregistrer la commande. Réessayez plus tard ou écrivez-moi par e-mail."]);
}
@chmod("$dir/$ref.json", 0600);
prevenir($commande);
reponse(200, ['ok' => true, 'ref' => $ref]);
