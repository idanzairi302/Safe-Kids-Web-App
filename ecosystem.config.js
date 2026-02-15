// SafeKids PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [
    {
      name: "safekids-api",
      script: "/var/www/safekids/backend/dist/server.js",
      cwd: "/var/www/safekids/backend",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      max_memory_restart: "500M",
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },
      // Log configuration
      error_file: "/var/log/safekids/error.log",
      out_file: "/var/log/safekids/output.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Restart policy
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Graceful shutdown
      kill_timeout: 5000,
      listen_timeout: 10000,
    },
  ],
};
