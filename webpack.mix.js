const mix = require("laravel-mix");
const connectSSI = require("connect-ssi");
const glob = require("glob");
const fs = require("fs");
const path = require("path");
require("laravel-mix-copy-watched");

const env = process.env;
const wordpress = env.WORDPRESS === "true" ? true : false;
const wpInstall = env.WP_INSTALL === "true" ? true : false;
const osSlash = env.OS === "mac" ? "/" : "\\";
const production = env.PRODUCTION === "true" ? true : false;

mix.setPublicPath("app");

let configOption = {
  output: {
    chunkFilename: (pathData) => {
      return pathData.chunk.name === "main" ? "[name].js" : `assets/${env.ASSETS_JS_DIR}/chunks/[name].js`;
    },
  },
  module: {
    rules: [
      {
        test: /\.scss/,
        loader: "import-glob-loader",
      },
      // {
      //   test: /\.(glsl|frag|vert)$/,
      //   exclude: /node_modules/,
      //   use: ["raw-loader", "glslify-loader"],
      // },
    ],
  },
};

if (production) {
  const TerserPlugin = require("terser-webpack-plugin");
  configOption.optimization = {
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
  };
}

mix.webpackConfig(configOption);

mix.options({
  manifest: false,
});

let browser = {
  port: env.DEV_PORT,
  files: ["app/**/*"],
};

const ssiOpition = connectSSI({
  baseDir: "app",
  ext: ".html",
});

if (!wordpress) {
  browser["middleware"] = ssiOpition;
} else {
  if (wpInstall) {
    browser["middleware"] = ssiOpition;
  }
}

if (wordpress) {
  browser["proxy"] = `http://localhost:${env.WP_PORT}/`;
} else {
  browser["server"] = "app";
}

mix.browserSync(browser);
mix.disableNotifications();

if (!production) {
  mix.sourceMaps(true, "inline-source-map");
}

function toPathAssets(file, srcName, assetsName) {
  const lastSlashIndex = file.lastIndexOf(osSlash);
  let modifiedUrl = file.substring(0, lastSlashIndex);
  modifiedUrl = modifiedUrl.replace(
    `${env.RESOURCE_DIR}${osSlash}${srcName}`,
    `app${env.SUB_DIR ?? osSlash + env.SUB_DIR}${osSlash}assets${osSlash + assetsName}`,
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

const bottomLevelDirectoriesIMG = getBottomLevelDirectories(`${env.RESOURCE_DIR}/${env.RESOURCE_IMG_DIR}`);
const bottomLevelDirectoriesMOVIE = getBottomLevelDirectories(`${env.RESOURCE_DIR}/${env.RESOURCE_MOVIE_DIR}`);

bottomLevelDirectoriesMOVIE.map((bottomLevelDir) => {
  const setPath = `${env.ASSETS_MOVIE_DIR}/${bottomLevelDir}`;
  mix.copyWatched(`${env.RESOURCE_DIR}/${setPath}`, `app${env.SUB_DIR ? "/" + env.SUB_DIR : ""}/assets/${setPath}`);
});

bottomLevelDirectoriesIMG.map((bottomLevelDir) => {
  const setPath = `${env.ASSETS_IMG_DIR}/${bottomLevelDir}`;
  mix.copyWatched(`${env.RESOURCE_DIR}/${setPath}`, `app${env.SUB_DIR ? "/" + env.SUB_DIR : ""}/assets/${setPath}`);
});

const ignores = env.RESOURCE_IGNORE.split(",");
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
      mix.js(file, toPathAssets(file, env.RESOURCE_JS_DIR, env.ASSETS_JS_DIR));
    }
  });

const cssOption = {
  processCssUrls: false,
  autoprefixer: {
    options: {
      grid: true,
    },
  },
  postCss: [],
};

if (production) {
  cssOption.postCss.push(
    require("cssnano")({
      preset: "default",
    }),
  );
}

glob
  .sync(`${env.RESOURCE_DIR}/**/*.scss`, {
    ignore: cssIgnores,
  })
  .map(function (file) {
    if (file) {
      mix.sass(file, toPathAssets(file, env.RESOURCE_CSS_DIR, env.ASSETS_CSS_DIR)).options(cssOption);
    }
  });
