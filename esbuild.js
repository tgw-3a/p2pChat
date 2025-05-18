import { build } from 'esbuild';

build({
  entryPoints: ['src/main/resources/static/js/libp2p.js'],
  bundle: true,
  minify: true,
  outfile: 'src/main/resources/static/js/bundle.js',
  define: {
    'process.env.RELAY_MULTIADDR': JSON.stringify(process.env.RELAY_MULTIADDR || ''),
    'process.env.NODE_ENV': '"production"',
  },
  platform: 'browser',
  target: ['es2020'],
}).catch(() => process.exit(1));