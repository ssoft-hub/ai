'use strict';
const { spawnSync } = require('child_process');
const os = require('os');

function escPS(s) { return String(s).replace(/'/g, "''"); }
function escAS(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }

function notifyWindows(title, message) {
  const t = escPS(title);
  const m = escPS(message);
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$n = New-Object System.Windows.Forms.NotifyIcon',
    '$n.Icon = [System.Drawing.SystemIcons]::Information',
    '$n.Visible = $true',
    `$n.ShowBalloonTip(4000, '${t}', '${m}', [System.Windows.Forms.ToolTipIcon]::Info)`,
    'Start-Sleep -Milliseconds 500',
    '$n.Dispose()',
  ].join('; ');
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], { stdio: 'pipe', timeout: 5000 });
}

function notifyMac(title, message) {
  const t = escAS(title);
  const m = escAS(message);
  spawnSync('osascript', ['-e', `display notification "${m}" with title "${t}"`], { stdio: 'pipe', timeout: 5000 });
}

function notifyLinux(title, message) {
  spawnSync('notify-send', ['--', title, message], { stdio: 'pipe', timeout: 5000 });
}

if (require.main === module) {
  const platform = os.platform();
  if (platform === 'win32') notifyWindows('Claude Code', 'Task complete');
  else if (platform === 'darwin') notifyMac('Claude Code', 'Task complete');
  else notifyLinux('Claude Code', 'Task complete');
}

module.exports = { escPS, escAS, notifyWindows, notifyMac, notifyLinux };
