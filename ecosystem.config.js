module.exports = {
  apps: [{
    name: 'tts-app',
    script: 'server.js',
    cwd: '/var/www/CongDeploy/CICD/run/text-to-speech',
    instances: 1,
    exec_mode: 'fork', // Explicitly use fork mode, not cluster
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'production',
      PORT: process.env.PORT || 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 5,
    min_uptime: '10s',
    kill_timeout: 5000,
    listen_timeout: 8000,
    shutdown_with_message: true
  }]
};