# 🛠️ BinaryLiquid Bridge — Automation & Management Scripts

Esta carpeta contiene todos los scripts de automatización para desplegar, gestionar y mantener el puente **BinaryLiquid** tanto en local como en cualquier servidor VPS (InterServer / Ubuntu / Debian).

---

## 📜 Índice de Scripts

| Script | Descripción |
|---|---|
| [`deploy-vps.sh`](./deploy-vps.sh) | Despliegue en 1-clic: compila el frontend, empaqueta el backend, lo sube vía SCP y reinicia PM2 y Nginx. |
| [`configure-wallets.sh`](./configure-wallets.sh) | Menú interactivo para cambiar claves privadas de Hot Wallets, direcciones, comisiones (fee %) y red (Chipnet/Mainnet). |
| [`check-status.sh`](./check-status.sh) | Inspecciona la salud del servidor, estado de PM2, saldos de las Hot Wallets y métricas de tesorería. |
| [`setup-ssl.sh`](./setup-ssl.sh) | Instala y renueva automáticamente certificados SSL HTTPS gratuitos con Let's Encrypt / Certbot. |
| [`backup-db.sh`](./backup-db.sh) | Crea una copia de seguridad con fecha y hora de la base de datos de swaps y tesorería (`bridge_db.json`). |

---

## 🚀 Guía de Uso

### 1. Desplegar actualizaciones al VPS
Desde tu máquina local:
```bash
chmod +x scripts/*.sh
./scripts/deploy-vps.sh 68.168.218.242 root
```

### 2. Cambiar claves privadas o saldo de Hot Wallets
Tanto en local como dentro del VPS:
```bash
./scripts/configure-wallets.sh
```
Te mostrará un menú interactivo:
```
1) Update BCH Hot Wallet WIF (Private Key)
2) Update BCH Hot Wallet Public Address
3) Update EVM Hot Wallet Private Key (Hex)
4) Update EVM Hot Wallet Public Address
5) Update Bridge Fee Percentage (e.g. 0.003 = 0.3%)
6) Switch Network Mode (chipnet vs mainnet)
7) Toggle Sandbox Simulation (true / false)
8) Reload Backend PM2 Process
```

### 3. Verificar el estado del puente en vivo
```bash
./scripts/check-status.sh https://bsprotocol.xyz
```

### 4. Configurar SSL para otro dominio
Si en el futuro cambias el dominio:
```bash
sudo ./scripts/setup-ssl.sh tu-nuevo-dominio.com admin@tu-dominio.com
```

### 5. Respaldar la base de datos
```bash
./scripts/backup-db.sh
```
Guarda el respaldo en `./backups/bridge_db_backup_YYYYMMDD_HHMMSS.json`.
