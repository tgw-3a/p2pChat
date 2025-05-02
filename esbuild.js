import path from 'path'
import { build } from 'esbuild'

build({
  entryPoints: ['src/main/js/libp2p.js'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: path.resolve(__dirname, 'src/main/resources/static/js/libp2p.js'),
}).catch(() => process.exit(1))