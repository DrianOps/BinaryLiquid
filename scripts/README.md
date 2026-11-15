# 🛠️ BinaryLiquid Protocol — Automation & Management Scripts

Esta carpeta contiene los scripts de automatización para desplegar, auditar y mantener **BinaryLiquid Protocol** tanto en desarrollo local como en el servidor de producción VPS (Ubuntu / Debian).

---

## 📜 Índice de Scripts

| Script | Descripción |
|---|---|
| [`deploy-vps.sh`](./deploy-vps.sh) | Despliegue en 1-clic: compila el frontend, empaqueta el backend, lo transfiere al VPS y reinicia PM2 y Nginx. |
| [`check-status.sh`](./check-status.sh) | Inspecciona la salud del backend relayer, estado de procesos PM2, puertos de escucha y contratos en vivo. |
| [`setup-ssl.sh`](./setup-ssl.sh) | Configura y renueva certificados SSL HTTPS gratuitos con Let's Encrypt / Certbot. |
| [`backup-db.sh`](./backup-db.sh) | Genera copias de seguridad con timestamp de los registros de swaps y auditorías de liquidez. |

---

## 🚀 Guía de Uso

### 1. Desplegar actualizaciones al VPS
Desde tu máquina local:
```bash
chmod +x scripts/*.sh
./scripts/deploy-vps.sh 68.168.218.242 root
```

### 2. Verificar el estado del protocolo en vivo
```bash
./scripts/check-status.sh https://bliquid.xyz
```

### 3. Configurar SSL para un dominio
```bash
sudo ./scripts/setup-ssl.sh bliquid.xyz admin@bliquid.xyz
```

### 4. Respaldar la base de datos
```bash
./scripts/backup-db.sh
```
Guarda el respaldo en `./backups/bridge_db_backup_YYYYMMDD_HHMMSS.json`.
