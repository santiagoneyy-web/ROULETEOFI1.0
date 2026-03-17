const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🛠️ Iniciando proceso de construcción especializado para Render...");

try {
    // 1. Intentar dar permisos de ejecución al binario de puppeteer
    const puppeteerBin = path.join(__dirname, 'node_modules', '.bin', 'puppeteer');
    if (fs.existsSync(puppeteerBin)) {
        console.log("🔓 Corrigiendo permisos del binario de Puppeteer...");
        try {
            execSync(`chmod +x "${puppeteerBin}"`);
            console.log("✅ Permisos corregidos.");
        } catch (e) {
            console.log("⚠️ No se pudo ejecutar chmod (posiblemente no es Linux), continuando...");
        }
    }

    // 2. Ejecutar la instalación del navegador
    // Usamos el comando directo pero con manejo de errores robusto
    console.log("🌐 Instalando navegador Chrome para Puppeteer...");
    
    // Intentar varias formas de instalación
    const commands = [
        'node node_modules/puppeteer/install.mjs',
        'node node_modules/puppeteer/install.js',
        './node_modules/.bin/puppeteer browsers install chrome',
        'npx puppeteer browsers install chrome'
    ];

    let success = false;
    for (const cmd of commands) {
        try {
            console.log(`尝试 (Intento): ${cmd}`);
            execSync(cmd, { stdio: 'inherit' });
            success = true;
            break; 
        } catch (err) {
            console.log(`❌ Falló con ${cmd.split(' ')[0]}, intentando siguiente...`);
        }
    }

    if (!success) {
        throw new Error("No se pudo instalar el navegador por ninguno de los métodos.");
    }

    console.log("✅ Proceso de construcción finalizado con éxito.");
} catch (error) {
    console.error("❌ ERROR CRÍTICO EN EL BUILD:");
    console.error(error.message);
    process.exit(1);
}
