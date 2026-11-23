/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4acd6345b6ff07bfe125db78285f78df"
  }, {
    "url": "pwa-512x512.png",
    "revision": "19f3fd21a174b1a7bbe4a4ded441bbb7"
  }, {
    "url": "pwa-192x192.png",
    "revision": "50a1684df367d72f488e79adc16f341d"
  }, {
    "url": "index.html",
    "revision": "cc65d385fcd0db0447e5db5d341e0408"
  }, {
    "url": "icon.svg",
    "revision": "8be557373b4a1c7435902f2a14fcacf3"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "290ce5a50844eafd5fccb2af773cb428"
  }, {
    "url": "assets/index-DmfnNx6z.css",
    "revision": null
  }, {
    "url": "assets/index-B7KM7gKc.js",
    "revision": null
  }, {
    "url": "assets/aistudio/Gemini_Generated_Image_w6rd0kw6rd0kw6rd_83cc7586.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224915.PNG_6780cf73.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224903.PNG_7a02e399.jpg",
    "revision": null
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224843.PNG_2b361288.jpg",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "290ce5a50844eafd5fccb2af773cb428"
  }, {
    "url": "icon.svg",
    "revision": "8be557373b4a1c7435902f2a14fcacf3"
  }, {
    "url": "pwa-192x192.png",
    "revision": "50a1684df367d72f488e79adc16f341d"
  }, {
    "url": "pwa-512x512.png",
    "revision": "19f3fd21a174b1a7bbe4a4ded441bbb7"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "4acd6345b6ff07bfe125db78285f78df"
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224843.PNG_2b361288.jpg",
    "revision": "d06adda652ecd5cb1dcb68b2ae5a7f98"
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224903.PNG_7a02e399.jpg",
    "revision": "de64cdfed9425414d4ac5d966656e3ba"
  }, {
    "url": "assets/aistudio/GCash-MyQR-23112026224915.PNG_6780cf73.jpg",
    "revision": "d80862cf3b93ea39964d2138e28b5528"
  }, {
    "url": "assets/aistudio/Gemini_Generated_Image_w6rd0kw6rd0kw6rd_83cc7586.jpg",
    "revision": "4100422d1f623d947a0f86be171e473c"
  }, {
    "url": "manifest.webmanifest",
    "revision": "92e63b4f366d5c60ae1f12a49276640e"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
