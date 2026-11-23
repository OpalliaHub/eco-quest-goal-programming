# Existing Linux ECS website

This installer updates the existing Eco Quest directory at `/var/www/eco-quest`. Its Nginx configuration is `/etc/blue-hour-nginx.conf`, with a dedicated `location ^~ /eco-quest/` block. These paths belong to this deployment. To run the project on a laptop, use the classroom instructions in the top-level README.

On the ECS host, check out the intended revision of this repository, then run the following command from its root.

```sh
sudo python3 deploy/install.py --revision "$(git rev-parse HEAD)"
```

The installer tests the kernel with the installed Python and SQLite libraries, stages the changed browser files and the two presentation downloads, saves the previous website and configuration, and checks both the direct and proxied health endpoints. It installs a systemd service under the unprivileged account `nobody`. The service reads its release from `/opt/eco-quest-kernel/current` and listens on `127.0.0.1:8766`. Only the existing Nginx listener serves classroom traffic. The instructor’s Python and SQL source links expose two teaching files under `/eco-quest/kernel/`.

```sh
systemctl status eco-quest-kernel
curl -fsS http://127.0.0.1:8766/api/health
curl -fsS http://127.0.0.1/eco-quest/api/health
```

If installation fails after activation begins, the installer restores the saved release and configuration. To revert a successful deployment, pass the printed checkpoint directory to `sudo python3 deploy/install.py --rollback DIRECTORY`. The rollback checks for intervening changes before touching the site. Keep the printed checkpoint and the preceding website directory until the release is accepted.
