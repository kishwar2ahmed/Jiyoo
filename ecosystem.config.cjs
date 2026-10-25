// PM2 Ecosystem Configuration for GoDaddy VPS & Dedicated Servers
module.exports = {
  apps: [
    {
      name: "jiyoo-fresh-store",
      script: "dist/server.cjs",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
