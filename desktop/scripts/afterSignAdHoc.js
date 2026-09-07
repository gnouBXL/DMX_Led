// Hook electron-builder "afterSign" — signature ad-hoc (gratuite, sans compte
// Apple Developer) pour que l'app arm64/Apple Silicon ne soit pas rejetée par
// Gatekeeper avec "l'app est endommagée" (macOS exige une signature, même
// ad-hoc, pour exécuter du code arm64).
const { execFileSync } = require('child_process')
const path = require('path')

module.exports = async function afterSign(context) {
  if (context.electronPlatformName !== 'darwin') return

  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(context.appOutDir, `${appName}.app`)

  console.log(`[afterSign] Signature ad-hoc de ${appPath}`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' })
}
