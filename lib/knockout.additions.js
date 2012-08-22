define(['knockout', 'amplify'], function (ko, amplify) {
    var self = this;
    ko.subscribable.fn.subscribeThenCallback = function (callback, callbackTarget, event) {
        // todo issue if the user uses passed value in callback, call back needs to be parameterless
        this.subscribe(callback, callbackTarget, event);
        callback();
    };

    self.rwObservable = function (args) {
        var observable = ko.observable(args.read());
        return ko.computed({
            read: function () {
                return observable();
            },
            write: function (value) {
                args.write(value);
                observable(args.read());
            }
        });
    };

// todo this is just an idea, but I would like it to be more of a decorator pattern perhaps ko.rwObservable.persisted(key)...
    self.persistedObservable = function (key) {
        return self.rwObservable({
            read: function () {
                return amplify.store(key);
            },
            write: function (value) {
                amplify.store(key, value);
            }
        });
    };
    return self;
})
