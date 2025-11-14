import { execSync } from 'node:child_process';\nexecSync('pnpm run -r build', { stdio: 'inherit' });\n
