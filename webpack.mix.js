const mix = require("laravel-mix");
const connectSSI = require("connect-ssi");
const glob = require("glob");
const fs = require("fs");
const path = require("path");
const TerserPlugin = require("terser-webpack-plugin");
require("laravel-mix-copy-watched");
const env = process.env;

let wordpress = env.WORDPRESS;
wordpress = wordpress === "true" ? true : false;

let osSlash = env.OS;
osSlash = osSlash === "mac" ? "/" : "\\";

mix.setPublicPath("app");
mix.webpackConfig({
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          output: {
            comments: false,
          },
        },
      }),
    ],
  },

  module: {
    rules: [
      {
        test: /\.scss/,
        loader: "import-glob-loader",
      },
    ],
  },
});
mix.options({
  manifest: false,
});

let browser = {
  port: env.DEV_PORT,
  files: ["app/**/*"],
  middleware: [
    connectSSI({
      baseDir: "app",
      ext: ".html",
    }),
  ],
};

if (wordpress) {
  browser["proxy"] = `http://localhost:${env.WP_PORT}/`;
} else {
  browser["server"] = "app";
}

mix.browserSync(browser);
mix.disableNotifications();

function toPathAssets(file, srcName, assetsName) {
  const lastSlashIndex = file.lastIndexOf(osSlash);
  let modifiedUrl = file.substring(0, lastSlashIndex);
  modifiedUrl = modifiedUrl.replace(
    `${env.RESOURCE_DIR}${osSlash}${srcName}`,
    `app${osSlash}${env.SUB_DIR}${osSlash}assets${osSlash}${assetsName}`,
  );
  return modifiedUrl;
}

function getBottomLevelDirectories(directoryPath) {
  const directories = [];

  function scanDirectory(currentPath) {
    const items = fs.readdirSync(currentPath);
    let hasSubdirectories = false;

    items.forEach((item) => {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        scanDirectory(itemPath);
        hasSubdirectories = true;
      } else {
        return;
      }
    });

    if (!hasSubdirectories && currentPath !== directoryPath) {
      const relativePath = path.relative(directoryPath, currentPath);
      const normalizedPath = relativePath.replace(/\\/g, "/");
      directories.push(normalizedPath);
    }
  }

  scanDirectory(directoryPath);

  return directories;
}

const bottomLevelDirectories = getBottomLevelDirectories(`${env.RESOURCE_DIR}/${env.SRC_IMG_DIR}`);

bottomLevelDirectories.map((bottomLevelDir) => {
  const setPath = `${env.ASSETS_IMG_DIR}/${bottomLevelDir}`;
  mix.copyWatched(`${env.RESOURCE_DIR}/${setPath}`, `app${env.SUB_DIR ? "/" + env.SUB_DIR : ""}/assets/${setPath}`);
});

const ignores = env.SRC_IGNORE.split(",");
const jsIgnores = [];
const cssIgnores = [];

for (const ignore of ignores) {
  jsIgnores.push(`${env.RESOURCE_DIR}/**/${ignore}/**/*.js`);
}
for (const ignore of ignores) {
  cssIgnores.push(`${env.RESOURCE_DIR}/**/${ignore}/**/*.scss`);
}

glob
  .sync(`${env.RESOURCE_DIR}/**/*.js`, {
    ignore: jsIgnores,
  })
  .map(function (file) {
    if (file) {
      mix.js(file, toPathAssets(file, env.SRC_JS_DIR, env.ASSETS_JS_DIR));
    }
  });

glob
  .sync(`${env.RESOURCE_DIR}/**/*.scss`, {
    ignore: cssIgnores,
  })
  .map(function (file) {
    if (file) {
      mix.sass(file, toPathAssets(file, env.SRC_CSS_DIR, env.ASSETS_CSS_DIR)).options({
        processCssUrls: false,
        autoprefixer: {
          options: {
            grid: true,
          },
        },
        postCss: [
          require("cssnano")({
            preset: "default",
          }),
          require("postcss-custom-properties")({
            preserve: false,
          }),
        ],
      });
    }
  });
