import svelte from 'rollup-plugin-svelte';
import resolve from	'rollup-plugin-node-resolve';
import commonjs	from 'rollup-plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser	} from 'rollup-plugin-terser';
import babel from '@rollup/plugin-babel';

const production = !process.env.ROLLUP_WATCH;

const babelConfig =	{
	extensions:	['.js',	'.mjs',	'.html', '.svelte'],
	babelHelpers: 'runtime',
	exclude: ['node_modules/@babel/**',	'node_modules/core-js/**'],
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					ie:	'11',
					chrome:	'58',
				},
				useBuiltIns: 'usage',
				corejs:	3,
			},
		],
	],
	plugins: [
		'@babel/plugin-syntax-dynamic-import',
		[
			'@babel/plugin-transform-runtime',
			{
				useESModules: true,
			},
		],
	],
};

export default {
	input: 'src/main.js',
	output:	{
		sourcemap: true,
		format:	'iife',
		name: 'app',
		file: 'public/bundle.js'
	},
	plugins: [
		svelte({
			// enable run-time checks when not in production
			dev: !production,
			// we'll extract any component CSS out into
			// a separate file — better	for	performance
			css: css =>	{
				css.write('public/bundle.css');
			}
		}),

		// If you have external	dependencies installed from
		// npm,	you'll most	likely need	these plugins. In
		// some	cases you'll need additional configuration —
		// consult the documentation for details:
		// https://github.com/rollup/rollup-plugin-commonjs
		resolve({
			browser: true,
			dedupe:	importee =>	importee === 'svelte' || importee.startsWith('svelte/')
		}),
		commonjs(),

		babel(babelConfig),

		// Watch the `public` directory	and	refresh	the
		// browser on changes when not in production
		!production	&& livereload('public'),

		// If we're	building for production	(npm run build
		// instead of npm run dev),	minify
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
