PJs
===

A ES6 Promises and Promises A/+ implementation that can handle multiple values.

```javascript
PJs.resolve($.get('http://jsfiddle.net')).
    then(function(data, textStatus, jqXHR) {
        return Promise.reject(jqXHR, textStatus);
    }).catch(function(jqXHR, textStatus) {
        // error
    });
```
