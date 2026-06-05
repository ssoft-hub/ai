'use strict';
const { spawnSync } = require('child_process');
const os = require('os');

function notifyWindows(title, message) {
  const script = [
    'Add-Type -AssemblyName System.Windows.Forms',
    '$n = New-Object System.Windows.Forms.NotifyIcon',
    '$n.Icon = [System.Drawing.SystemIcons]::Information',
    '$n.Visible = $true',
    `$n.ShowBalloonTip(4000, '${title}', '${message}', [System.Windows.Forms.ToolTipIcon]::Info)`,
    'Start-Sleep -Milliseconds 4500',
    '$n.Dispose()',
  ].join('; ');
  spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', script], { stdio: 'pipe', timeout: 10000 });
}

function notifyMac(title, message) {
  spawnSync('osascript', ['-e', `display notification "${message}" with title "${title}"`], { stdio: 'pipe', timeout: 5000 });
}

function notifyLinux(title, message) {
  spawnSync('notify-send', [title, message], { stdio: 'pipe', timeout: 5000 });
}

const platform = os.platform();
if (platform === 'win32') notifyWindows('Claude Code', 'Task complete');
else if (platform === 'darwin') notifyMac('Claude Code', 'Task complete');
else notifyLinux('Claude Code', 'Task complete');
