// TODO: AsyncStorage from community work work:
// [@RNC/AsyncStorage]: NativeModule: AsyncStorage is null.
// AsyncStorage is slated to be removed from React Native,
// find a different storage solution that works before it
//import AsyncStorage from '@react-native-community/async-storage';
import { AsyncStorage } from 'react-native';
import localForage from 'localforage';
import isNil from 'lodash/isNil';
import MockStorage from 'src/utils/test/MockStorage';
import isJestRunning from 'src/utils/test/isJestRunning';
import { useState, useEffect } from 'react';
import os from 'src/utils/os';
import * as env from 'src/common/env';

class Storage {

  constructor() {
    this.listeners = {};
    this.err_serialize = 'Storage Error: Failed to persist data due to possible data corruption';
    this.err_deserialize = 'Storage Error: Failed due to corruption in persisted data';
    this.err_set = 'Storage Error: Failed to persist data';
    this.err_get = 'Storage Error: Failed to retrieve persisted data';
    this.err_delete = 'Storage Error: Failed to delete from local storage';
  }

  // AsyncStorage doesn't work on jest for mobile
  // environments, so create a mock for tests
  _getMobileStorage() {
    return isJestRunning() ? MockStorage : AsyncStorage
  }

  // function to attach a listener for a specific key
  addListener(key, callback) {
    // create a signature to identify the function
    // while removing the listener 
    const signature = Math.round(Math.random() * 100000000);
    // initiate and push the callback
    if (!this.listeners[key]) this.listeners[key] = {};
    this.listeners[key][signature] = callback;
    // return a function that removes the registered listener
    return () => {
      this._removeListener(key, signature)
    };
  }

  // function to remove a single listener with key and signature
  _removeListener(key, signature) {
    if (this.listeners[key] && this.listeners[key][signature]) {
      this.listeners[key][signature] = null;
      delete this.listeners[key][signature];
    }
  }

  // remove all listeners under a key
  removeAllListeners(key) {
    this.listeners[key] = null;
    delete this.listeners[key];
  }

  // trigger listeners on a key with a value
  triggerListeners(key) {
    if (this.listeners[key] && typeof this.listeners[key] === 'object') {
      // fetch the value from storage just
      // to make sure it was stored properly
      this.get(key).then(value => {
        // loop through all listeners attached to a key
        Object.values(this.listeners[key]).forEach(fn => {
          // invoke the listener with the value
          if (typeof fn === 'function') fn(value)
        })
      })
    }
  }

  _resolveError(msg, err) {
    return env.DEBUG ? err : msg;
  }

  _serializeValue(value, errCallback) {
    try {
      return JSON.stringify({ value })
    } catch(e) {
      errCallback(
        this._resolveError(this.err_serialize, e)
      )
    }
  }

  _parseValue(value, errCallback) {
    try {
      return JSON.parse(value);
    } catch(e) {
      errCallback(
        this._resolveError(this.err_serialize, e)
      )
    }
  }

  set(key, v) {
    return new Promise((resolve, reject) => {
      try {
        const value = this._serializeValue(v, reject);

        // use localforage for web environments
        if (os('desktop')) {
          localForage.setItem(key, value, err => {
            this._setResolve(resolve, reject, key, err);
          });
        }

        // use async storage for mobile
        if (os('mobile')) {
          const Storage = this._getMobileStorage();
          Storage.setItem(key, value, err => {
            this._setResolve(resolve, reject, key, err);
          })
        }
      } catch(e) {
        reject(this._resolveError(this.err_set, e))
      }
    })
  }

  // TODO: setMany

  // control set response
  _setResolve(resolve, reject, key, err) {
    if (isNil(err)) {
      // if there are listeners for a particular key,
      // trigger them with the saved value
      this.triggerListeners(key);
      // resolve
      this.get(key).then(resolve).catch(reject)
    } else {
      reject(this._resolveError(this.err_set, err));
    }
  }

  get(key) {
    return new Promise((resolve, reject) => {
      try {

        // use localforage for web environments
        if (os('desktop')) {
          localForage.getItem(key, (err, result) => {
            return this._getResolve(resolve, reject, err, result)
          })
        }

        // use async storage for mobile
        if (os('mobile')) {
          const Storage = this._getMobileStorage();
          Storage.getItem(key, (err, result) => {
            return this._getResolve(resolve, reject, err, result)
          })
        }

      } catch(e) {
        reject(this._resolveError(this.err_get, e))
      }
    })
  }

  _getResolve(resolve, reject, err, result) {
    if (!isNil(err)) {
      reject(this._resolveError(this.err_get, err));
    } else {
      if (!result) { resolve(null); return; }
      const parsed = this._parseValue(result, reject);
      const value = parsed.value;
      resolve(value)
    }
  }

  // get all keys stored at once
  getKeys() {
    return new Promise((resolve, reject) => {
      if (os('desktop')) {
        localForage
          .keys()
          .then(resolve)
          .catch(err => {
            reject(this._resolveError(this.err_get, err))
          })
      }
      if (os('mobile')) {
        const Storage = this._getMobileStorage();
        Storage.getAllKeys((err, keys) => {
          if (err) reject(this._resolveError(this.err_get, err));
          else resolve(keys);
        })
      }
    })
  }

  // remove an item
  removeItem(key) {
    return new Promise((resolve, reject) => {
      if (os('desktop')) {
        localForage
          .removeItem(key)
          .then(resolve)
          .catch(err => {
            reject(this._resolveError(this.err_delete, err));
          })
      }
      if (os('mobile')) {
        const Storage = this._getMobileStorage();
        Storage.removeItem(key, (err => {
          if (err) reject(this._resolveError(this.err_delete, err));
          else resolve();
        }))
      }
    })
  }

  // remove multiple items at once
  removeItems(keys = []) {
    return new Promise(async (resolve, reject) => {
      if (os('desktop')) {
        Promise
          .all(keys.map(this.removeItem))
          .then(resolve)
          .catch(err => {
            reject(this._resolveError(this.err_delete, err));
          }) 
      }
      if (os('mobile')) {
        const Storage = this._getMobileStorage();
        Storage.multiRemove(keys, (err => {
          if (err) reject(this._resolveError(this.err_delete, err[0]));
          else resolve();
        }))
      }
    })
  }

  // clear everything
  clear() {
    return new Promise((resolve, reject) => {
      if (os('desktop')) {
        localForage
          .clear()
          .then(resolve)
          .catch(err => {
            reject(this._resolveError(this.err_delete, err));
          })
      }
      if (os('mobile')) {
        const Storage = this._getMobileStorage();
        Storage.clear(err => {
          if (err) reject(this._resolveError(this.err_delete, err));
          else resolve();
        })
      }
    })
  }
}

// instantiate the storage
const storageInstance = new Storage();

// hook that to register / deregister a listener for
// changes in storage with a particular key
export const useListener = (key, callback) => {
  // keep a loading state
  const [ fetching, setFetching ] = useState(true);
  useEffect(() => {
    // attach listener
    const removeListener = storageInstance.addListener(key, callback);
    // receive the value and trigger 
    // the callback manually on mount
    storageInstance.get(key).then(val => {
      setFetching(false);
      if (typeof callback === 'function') {
        callback(val);
      }
    })
    // detach listener on unmount
    return () => {
      removeListener();
    }
  }, []);
  return fetching;
}

// hook that fetch a value with a key from the store
// on mount or with triggers 
export const useStoredValue = key => {
  // create a state variable to store the value
  const [ val, setVal ] = useState(null);
  // register a listener to keep the value updated
  const fetching = useListener(key, newVal => setVal(newVal));
  // return the value and its fetching state
  return [val, fetching]
}

// default export the storage instance
export default storageInstance;