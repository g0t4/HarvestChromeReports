define(['amplify', 'jquery', 'jquery.base64', 'linq'], function (amplify, $) {
    var module = this;

    module.HarvestClient = function (user, password, harvestUrl) {
        var client = this;
        client.harvestParameters = function (parameters) {
            parameters.dataType = "json";
            parameters.url = harvestUrl + parameters.url
            var hash = $.base64.encode(user + ":" + password);
            parameters.headers = {
                Authorization: 'Basic ' + hash,
                Accept: 'application/json'
            };
            parameters.failure = function (response, textStatus, errorThrown) {
                console.log('error');
                console.log(response);
                console.log(textStatus);
                console.log(errorThrown);
            };
            return parameters;
        }

        var projectsParameters = {
            url: '/projects',
            resourceId: 'projects',
            cache: 'persist'
        };
        amplify.request.define("projects", "ajax", client.harvestParameters(projectsParameters));
        client.getProjectsById = function (success, error) {
            amplify.request({
                resourceId: 'projects',
                success: function (result) {
                    var projects = {};
                    Enumerable.From(result)
                        .Select("$.project")
                        .ForEach(function (p) { projects[p.id] = p; });
                    success(projects);
                },
                error: error
            })
        }

        var userParameters = {
            url: '/people',
            resourceId: 'people',
            cache: 'persist'
        };
        amplify.request.define("people", "ajax", client.harvestParameters(userParameters));
        client.getUsersById = function (success, error) {
            amplify.request({
                resourceId: 'people',
                success: function (result) {
                    var users = {};
                    Enumerable.From(result)
                        .Select("$.user")
                        .ForEach(function (u) { users[u.id] = u; });
                    success(users);
                },
                error: error
            })
        }

        client.clearCachedResource = function (resourceId) {
            for (var key in localStorage) {
                if (key.indexOf("__amplify__request-" + resourceId) != -1) {
                    localStorage.removeItem(key);
                }
            }
        }
        client.clearCaches = function () {
            client.clearCachedResource("people");
            client.clearCachedResource("projects");
        }
        return client;
    }
    return module;
})