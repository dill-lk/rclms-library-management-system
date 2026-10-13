/**
 * Zebra Browser Print JavaScript SDK (v3.1)
 * Compatible with Zebra Browser Print Desktop Client on HTTP (9100) and HTTPS (9101)
 */
(function(window) {
  'use strict';

  var BrowserPrint = (function() {
    function getBaseUrl() {
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        return 'https://localhost:9101/';
      }
      return 'http://localhost:9100/';
    }

    function makeRequest(method, endpoint, data, successCallback, errorCallback) {
      var baseUrl = getBaseUrl();
      var xhr = new XMLHttpRequest();
      xhr.open(method, baseUrl + endpoint, true);

      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            var response = xhr.responseText;
            try {
              response = JSON.parse(response);
            } catch (e) {}
            if (successCallback) successCallback(response);
          } else {
            if (errorCallback) {
              errorCallback(xhr.statusText || ('HTTP ' + xhr.status + ' on ' + baseUrl + endpoint));
            }
          }
        }
      };

      xhr.onerror = function() {
        if (errorCallback) {
          errorCallback('Could not connect to Zebra Browser Print on ' + baseUrl);
        }
      };

      if (data) {
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
        xhr.send(typeof data === 'string' ? data : JSON.stringify(data));
      } else {
        xhr.send();
      }
    }

    return {
      getBaseUrl: getBaseUrl,

      getDefaultDevice: function(type, success, error) {
        makeRequest('GET', 'default?type=' + (type || 'printer'), null, success, error);
      },

      getLocalDevices: function(success, error, type) {
        makeRequest('GET', 'available?type=' + (type || 'printer'), null, success, error);
      },

      print: function(device, data, success, error) {
        var payload = {
          device: device,
          data: data
        };
        makeRequest('POST', 'write', payload, success, error);
      },

      send: function(data, success, error) {
        var self = this;
        this.getDefaultDevice('printer', function(device) {
          self.print(device, data, success, error);
        }, error);
      }
    };
  })();

  if (typeof window !== 'undefined') {
    window.BrowserPrint = BrowserPrint;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrowserPrint;
  }
})(typeof window !== 'undefined' ? window : this);
