<?php
/**
 * CLI SMTP mailer for the School Management System.
 *
 * Required environment variables:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM
 *
 * Optional environment variables:
 *   SMTP_SECURE=tls|ssl|none, EMAIL_FROM_NAME
 *
 * Usage:
 *   php app/utils/mail.php --to recipient@example.com --subject "Subject" --body "HTML or text body"
 */

function fail(string $message, int $code = 1): void
{
    fwrite(STDERR, $message . PHP_EOL);
    exit($code);
}

function env_required(string $key): string
{
    $value = getenv($key);
    if ($value === false || trim($value) === '') {
        fail("Missing required environment variable: {$key}");
    }
    return trim($value);
}

function sanitize_header(string $value): string
{
    return trim(str_replace(["\r", "\n"], '', $value));
}

function parse_from(string $from): array
{
    if (preg_match('/^(.*?)\s*<([^>]+)>$/', $from, $matches)) {
        return [sanitize_header(trim($matches[2])), sanitize_header(trim($matches[1], ' "'))];
    }

    return [sanitize_header($from), sanitize_header((string)getenv('EMAIL_FROM_NAME') ?: 'School Management System')];
}

function read_smtp_line($socket): string
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') {
            break;
        }
    }
    return $response;
}

function smtp_command($socket, string $command, array $expectedCodes): string
{
    if ($command !== '') {
        fwrite($socket, $command . "\r\n");
    }

    $response = read_smtp_line($socket);
    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        fail("SMTP command failed: {$command}; response: " . trim($response));
    }

    return $response;
}

$options = getopt('', ['to:', 'subject:', 'body:', 'text::']);
$to = sanitize_header((string)($options['to'] ?? ''));
$subject = sanitize_header((string)($options['subject'] ?? ''));
$body = (string)($options['body'] ?? '');
$text = (string)($options['text'] ?? strip_tags($body));

if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
    fail('A valid --to email address is required.');
}
if ($subject === '') {
    fail('A non-empty --subject is required.');
}
if ($body === '') {
    fail('A non-empty --body is required.');
}

$smtpHost = env_required('SMTP_HOST');
$smtpPort = (int)env_required('SMTP_PORT');
$smtpUser = env_required('SMTP_USER');
$smtpPassword = env_required('SMTP_PASSWORD');
[$fromEmail, $fromName] = parse_from(env_required('EMAIL_FROM'));

if (!filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
    fail('EMAIL_FROM must contain a valid email address.');
}

$secure = strtolower(trim((string)getenv('SMTP_SECURE') ?: 'tls'));
$transport = $secure === 'ssl' ? 'ssl://' : '';
$socket = stream_socket_client(
    $transport . $smtpHost . ':' . $smtpPort,
    $errno,
    $errstr,
    20,
    STREAM_CLIENT_CONNECT
);

if (!$socket) {
    fail("SMTP connection failed: {$errstr} ({$errno})");
}

stream_set_timeout($socket, 20);
smtp_command($socket, '', [220]);
smtp_command($socket, 'EHLO localhost', [250]);

if ($secure === 'tls' || $secure === 'starttls') {
    smtp_command($socket, 'STARTTLS', [220]);
    if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
        fail('Unable to start TLS encryption.');
    }
    smtp_command($socket, 'EHLO localhost', [250]);
}

smtp_command($socket, 'AUTH LOGIN', [334]);
smtp_command($socket, base64_encode($smtpUser), [334]);
smtp_command($socket, base64_encode($smtpPassword), [235]);
smtp_command($socket, 'MAIL FROM:<' . $fromEmail . '>', [250]);
smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
smtp_command($socket, 'DATA', [354]);

$boundary = 'sms_' . bin2hex(random_bytes(12));
$headers = [
    'From: ' . $fromName . ' <' . $fromEmail . '>',
    'To: <' . $to . '>',
    'Subject: ' . $subject,
    'MIME-Version: 1.0',
    'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
];

$message = implode("\r\n", $headers) . "\r\n\r\n";
$message .= '--' . $boundary . "\r\n";
$message .= "Content-Type: text/plain; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $text . "\r\n\r\n";
$message .= '--' . $boundary . "\r\n";
$message .= "Content-Type: text/html; charset=UTF-8\r\n";
$message .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$message .= $body . "\r\n\r\n";
$message .= '--' . $boundary . "--\r\n";
$message = preg_replace('/^\./m', '..', $message);

fwrite($socket, $message . "\r\n.\r\n");
smtp_command($socket, '', [250]);
smtp_command($socket, 'QUIT', [221]);
fclose($socket);

echo 'Email sent.' . PHP_EOL;