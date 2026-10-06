/* وتر PWA storage v1 */
(function () {
  "use strict";
  var DB_NAME = "watar-pwa-storage";
  var STORE = "snapshots";
  var KEY = "localStorage";
  var RELOAD_KEY = "__watar_storage_restore_in_progress__";

  function openDB() {
    return new Promise(function (resolve, reject) {
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE); };
      r.onsuccess = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
    });
  }

  function readSnapshot() {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readonly");
        var req = tx.objectStore(STORE).get(KEY);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function writeSnapshot() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      data[k] = localStorage.getItem(k);
    }
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(data, KEY);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    }).catch(function(){});
  }

  function restoreIfEmpty() {
    if (localStorage.length !== 0) return Promise.resolve(false);
    return readSnapshot().then(function (data) {
      if (!data || !Object.keys(data).length) return false;
      Object.keys(data).forEach(function (k) {
        try { localStorage.setItem(k, data[k]); } catch (e) {}
      });
      return true;
    }).catch(function(){ return false; });
  }

  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(function(){});
    }
  } catch (e) {}

  restoreIfEmpty().then(function (restored) {
    if (restored && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      location.reload();
      return;
    }
    try { sessionStorage.removeItem(RELOAD_KEY); } catch (e) {}
    writeSnapshot();
    setInterval(writeSnapshot, 2500);
  });
})();
