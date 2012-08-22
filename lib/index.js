var view = {};
require(['knockout', 'jquery', 'knockout.mapping', 'amplify', 'knockout.additions', 'date', 'harvest', 'highcharts', 'linq', 'jquery.base64', 'number-functions', 'index.piechartbindinghandler'],
    function (ko, $, mapper, amplify, koAdditions, date, harvest) {

        function CommitmentReport() {
            var self = this;
            self.password = koAdditions.persistedObservable('password');
            self.user = koAdditions.persistedObservable('user');
            // todo use whoami to get harvestUrl
            self.harvestUrl = ko.observable("https://phoenixwebgroup.harvestapp.com");
            self.password.subscribe(setupClient);
            self.user.subscribe(setupClient);
            self.harvestUrl.subscribe(setupClient);
            setupClient();
            function setupClient() {
                self.client = new harvest.HarvestClient(self.user(), self.password(), self.harvestUrl());
            }

            self.users = ko.observableArray([]);
            self.projectsById = {};

            self.start = ko.observable(Date.today().addWeeks(-1).toString("yyyy-MM-dd"));
            self.end = ko.observable(Date.today().addDays(-1).toString("yyyy-MM-dd"));

            self.refresh = function () {
                self.client.getProjectsById(function (projectsById) {
                    self.projectsById = projectsById;
                    // todo would be nice to find a JS continuations library
                    self.client.getUsersById(loadUserCommitments);
                })
            }

            function loadUserCommitments(usersById) {
                amplify.request.define("entries", "ajax", self.client.harvestParameters({
                    url: "/people/{userId}/entries",
                    resourceId: 'entries',
                    // todo add caching once I can figure out why amplify is causing key collisions on data parameters
                    cache: 'persist',
                    decoder: 'xmlToJsonDecoder'
                }));
                self.users.removeAll();
                Enumerable.From(usersById)
                    .ForEach(function (user) {
                        amplify.request({
                                data: {
                                    from: self.start(),
                                    to: self.end(),
                                    userId: user.Key
                                },
                                resourceId: 'entries',
                                success: function (response) {
                                    var entries = Enumerable.From(response)
                                        .Select("$.day_entry")
                                        .ToArray();
                                    self.users.push(new UserCommitments(user.Value, entries));
                                }
                            }
                        );
                    });
            }

            function UserCommitments(user, entries) {
                entries = Enumerable.From(entries)
                    .Select(function (entry) {
                        return {
                            hours: parseFloat(entry.hours),
                            // todo separate query for billable versus not?
                            billableHours: 0,
                            projectId: parseInt(entry.project_id)
                        }
                    });

                var userCommitments = {
                    id: user.id,
                    name: user.last_name + ", " + user.first_name,
                    isActive: user.is_active == "true",
                    totalHours: entries.Sum("$.hours"),
                    totalBillableHours: entries.Sum("$.billableHours")
                }

                if (userCommitments.totalHours == 0) {
                    return userCommitments;
                }

                userCommitments.commitments = entries.GroupBy("$.projectId")
                    .Select(function (p) { return new Commitment(p, userCommitments.totalHours); })
                    .OrderByDescending(function (p) { return p.projectRatio;})
                    .ToArray()
                userCommitments.maxRatio = Enumerable.From(userCommitments.commitments)
                    .Max("$.projectRatio") || 0;
                userCommitments.chart = {
                    data: Enumerable.From(userCommitments.commitments)
                        .Select(function (c) { return [ c.projectName, c.projectRatio];})
                        .ToArray(),
                    title: null
                };
                return userCommitments;
            }

            function Commitment(projectEntries, totalHours) {
                var projectHours = projectEntries.Sum("$.hours");
                var projectId = projectEntries.Key();
                var project = self.projectsById[projectId];
                var commitment = {
                    projectId: projectId,
                    projectName: project ? project.name : 'Missing Project: ' + projectId,
                    projectHours: projectHours,
                    projectRatio: projectHours / totalHours * 100
                }
                commitment.projectRatioFormatted = commitment.projectRatio.numberFormat("#.00") + "%";
                return commitment;
            }

            self.sortOptions = ['Max Ratio', 'Total Hours', 'Total Billable Hours'];
            self.sortOn = ko.observable(self.sortOptions[0]);

            self.usersWithWork = ko.computed(function () {
                return Enumerable.From(self.users())
                    .Where(function (u) { return u.totalHours > 0;})
                    .OrderByDescending(function (u) {
                        switch (self.sortOn()) {
                            case 'Total Hours':
                                return u.totalHours;
                            case 'Total Billable Hours':
                                return u.totalBillableHours;
                            case 'Max Ratio':
                            default:
                                return u.maxRatio;
                        }
                    })
                    .ThenBy("$.name")
                    .ToArray();
            })

            self.usersWithoutWork = ko.computed(function () {
                return Enumerable.From(self.users())
                    .Where(function (u) { return u.totalHours == 0;})
                    .Where(function (u) { return u.isActive;})
                    .OrderBy(function (u) { return u.name;})
                    .ToArray();
            })

            self.clearCaches = function () {
                // todo clear entries caches
                self.client.clearCachedResource("entries");
                self.client.clearCaches();
            }

            return self;
        }

        $(function () {
            view = new CommitmentReport();
            ko.applyBindings(view);
        })
    }
);