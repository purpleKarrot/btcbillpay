/*eslint-env node*/

import browsersync from "rollup-plugin-browsersync";
import copy from "rollup-plugin-copy";
import svelte from "rollup-plugin-svelte";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import postcss from "rollup-plugin-postcss";
import purgecss from "@fullhuman/postcss-purgecss";

const production = !process.env.ROLLUP_WATCH;

export default {
  input: "App.svelte",
  output: {dir: "dist"},
  plugins: [
    !production && browsersync({https: true, open: true, server: {baseDir: "dist"}}),
    copy({targets: [{src: "index.html", dest: "dist"}]}),
    postcss({
      extract: true,
      minimize: production,
      plugins: [production && purgecss({content: ["App.svelte"]})],
    }),
    resolve({
      browser: true,
      exportConditions: ["svelte"],
      extensions: [".svelte"],
    }),
    svelte(),
    production && terser(),
  ],
};
