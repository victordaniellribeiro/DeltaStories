Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //API Docs: https://help.rallydev.com/apps/2.1/doc/    
        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];
        this.projectId = project;        
        //var project = 90681998188;

        var initDate = '';
        var endDate = '';

        //global releases ids
        this.releases = [];

        var baseReleaseName = '';
        var baseReleaseId = '';

        console.log('project: ', project);
        var that = this;

        var initDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'From:',
            scope: this,
        	listeners : {
        		select: function(picker, date) {
        			//console.log(date);
        			initDate = date.toISOString();
        		}
        	}
        });

        var endDatePicker = Ext.create('Ext.form.field.Date', {
        	fieldLabel: 'To:',
        	listeners : {
        		select: function(picker, date) {
        			//console.log(date);
        			endDate = date.toISOString();
        		}
        	}
        });

		var releaseComboBox = Ext.create('Rally.ui.combobox.ReleaseComboBox',{
        	itemId : 'releaseComboBox',
        	//allowClear: true,
        	scope: this,
        	listeners : {
        		ready: function(combobox) {
        			baseReleaseId = combobox.getRecord().get('ObjectID');
        			baseReleaseName = combobox.getRecord().get('Name');        			
        		},
	        	select: function(combobox, records, opts) {
        			baseReleaseId = combobox.getRecord().get('ObjectID');
        			baseReleaseName = combobox.getRecord().get('Name');
	        	}
	        }

        });

        var searchButton = Ext.create('Rally.ui.Button', {
        	text: 'Search',
        	margin: '10 10 10 100',
        	scope: this,
        	handler: function() {
        		//handles search
        		//console.log(initDate, endDate);
        		this._doSearch(initDate, endDate, project, baseReleaseName, baseReleaseId);
        	}
        });

        var featureSummaryPanel = Ext.create('Ext.panel.Panel', {
            title: 'Feature Summary',
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 5
            },
            padding: 5,
            itemId: 'featureSummaryPanel',
        });

        var storySummaryPanel = Ext.create('Ext.panel.Panel', {
            title: 'Story Summary',
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 5
            },
            padding: 5,
            itemId: 'storySummaryPanel',
        });

        var datePanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            align: 'stretch',
            padding: 5,
            itemId: 'datePanel',
            items: [
                {
	                xtype: 'panel',
	                flex: 1,
	                itemId: 'filterPanel'
                },
                {
	                xtype: 'panel',
	                flex: 1,
	                itemId: 'tooltipPanel'
                }
            ]
        });


        var mainPanel = Ext.create('Ext.panel.Panel', {
            layout: 'hbox',
            padding: 5,
            itemId: 'parentPanel',
            items: [
                {
	                xtype: 'panel',
	                title: 'Features At Start Date',
	                flex: 1,
	                itemId: 'childPanel1'
                },           {
                	xtype:'splitter' 
                },
                {
	                xtype: 'panel',
	                title: 'Features At End Date',
	                flex: 1,
	                itemId: 'childPanel2'
                }
            ]
        });


        this.myMask = new Ext.LoadMask({
		    msg    : 'Please wait...',
		    target : this
		});


        this.add(datePanel);
        datePanel.down('#filterPanel').add(initDatePicker);
        datePanel.down('#filterPanel').add(endDatePicker);
        datePanel.down('#filterPanel').add(releaseComboBox);
        datePanel.down('#filterPanel').add(searchButton);

        datePanel.down('#tooltipPanel').add({
            id: 'tooltipContent1',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#cdf9c2; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features present at start date and at the end date with state <b>Staging</b> or <b>Done</b>.</div>'+
            	  '</div>'
        },{
            id: 'tooltipContent2',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#c2d7f9; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features absent at the start date and present at end date.</div>'+
            	  '</div>'
        },{
            id: 'tooltipContent3',
            padding: 5,
            height: 45,
            overflowX: 'auto',
            overflowY: 'auto',
            html: '<div style= "clear:both">'+
            		'<div style="background-color:#ffe2e2; width:20px; height:20px; margin:5px; float:left;"></div>'+
            		'<div style="height:20px; margin:5px; float:left;">Features present at the start date, but absent at end date.</div>'+
            	  '</div>'
        });

        this.add(featureSummaryPanel);
        this.add(storySummaryPanel);
        this.add(mainPanel);

    },


    _doSearch: function(initDate, endDate, projectId, baseReleaseName, baseReleaseId) {
    	//gather all releases 
    	console.log('parent release name: ', baseReleaseName);
    	console.log('looking for:', initDate, endDate, projectId);
        this.initDate = initDate;
        this.endDate = endDate;


    	if (initDate == '' || endDate == '') {
    		return;
    	}

    	this.myMask.show();

    	//clear relase filter:
    	this.releases = [];


    	//this recovers all releases from a parent project given the release name.
    	Ext.create('Rally.data.wsapi.Store', {
		    model: 'Release',
		    autoLoad: true,
		    context: {
		        projectScopeUp: false,
		        projectScopeDown: true,
		        project: null //null to search all workspace
		    },


			filters: Rally.data.QueryFilter.or([
                Rally.data.QueryFilter.and([
                    {
                        property: 'Project.ObjectID',
                        value: projectId
                    },
                    {
                        property: 'name',
                        value: baseReleaseName
                    }   
                ]),
                    Rally.data.QueryFilter.or([

                        Rally.data.QueryFilter.and([
                            {
                                property: 'Project.parent.ObjectID',
                                value: projectId
                            },
                            {
                                property: 'name',
                                value: baseReleaseName
                            }   
                        ]),
                        
                        Rally.data.QueryFilter.and([
                            {
                                property: 'Project.parent.parent.ObjectID',
                                value: projectId
                            },
                            {
                                property: 'name',
                                value: baseReleaseName
                            }   
                        ])
                    ])
                ]),

		    listeners: {
		        load: function(store, data, success) {
		            //console.log('Store:', store);
		            //console.log('Data:', data);

		            //this checks if the project is a leaf. 
		            //will return 0 child releases if so. else will return all releases id.
		            if (data.length > 0) {
		            	console.log('multiple releases found:', data);
			            var localReleases = [];

			            _.each(data, function(record) {
				        	localReleases.push(record.get('ObjectID'));
				        });

				        this.releases = localReleases;
				        console.log('releases: ', this.releases);
				    } else {
				    	console.log('single release found, using baseReleaseId:', baseReleaseId);
				    	this.releases = [baseReleaseId];
				    }

			        this.filtersInit = [
			    		{
			                property : '__At',
			                value    : initDate
			            },
			            
			            {
			                property : '_TypeHierarchy',
			                value    : 'PortfolioItem/Feature'
			            },
			           	{
			                property : '_ProjectHierarchy',
			                value: projectId
			            },	            

			            {
			                property : 'Release',
			                operator: 'in',
			                value: this.releases
			                //value: releaseId
			            }	
			    	];

			    	this.filtersEnd = [
			    		{
			                property : '__At',
			                value    : endDate
			            },
			            
			            {
			                property : '_TypeHierarchy',
			                value    : 'PortfolioItem/Feature'
			            },
			           	{
			                property : '_ProjectHierarchy',
			                value: projectId
			            },
			            {
			                property : 'Release',
			                operator: 'in',
			                value: this.releases
			            }
			    	];

			    	this._loadInitData();
		        },
		        scope: this
		    },
		    fetch: ['Description', 'Name', 'ObjectID'],
            limit: Infinity
		});
    },


    _loadInitData: function () {
    	console.log('loading init features');
    	//console.log('filters:', this.filtersInit);
    	var store = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch : ['Name', 
                'FormattedID', 
                'LeafStoryPlanEstimateTotal', 
                'LeafStoryCount', 
                'PreliminaryEstimate', 
                'State', 
                'Parent', 
                'PercentDoneByStoryPlanEstimate', 
                "_ValidFrom", 
                "_ValidTo"],
            filters : this.filtersInit,
            autoLoad: true,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],
            limit: Infinity,
            hydrate: ['State'],

            listeners: {
                load: function(store, data, success) {
                	console.log('Init Store', store);
                	this.initItems = data;
                	this._loadEndData();
                },
                scope: this
            }
        });
    },


    _loadEndData: function() {
        console.log('loading end features');
        var store2 = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch : ['Name',
                'FormattedID',
                'LeafStoryPlanEstimateTotal',
                'PreliminaryEstimate',
                'State',
                'Parent',
                'PercentDoneByStoryPlanEstimate',
                "_ValidFrom",
                "_ValidTo",
                'LeafStoryCount',
                'AcceptedLeafStoryCount',
                'AcceptedLeafStoryPlanEstimateTotal',
                'ActualEndDate'
            ],
            filters: this.filtersEnd,
            autoLoad: true,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],
            limit: Infinity,
            hydrate: ['State'],

            listeners: {
                load: function(store, data, success) {
                    this.endItems = data;
                    this._onStoriesLoaded();
                },
                scope: this
            }
        });
    },

     //make grid of stories 
    _onStoriesLoaded: function() {
        var that = this;
        var initFeatures = [];
        var endFeatures = [];
        var initIds = [];
        var endIds = [];
        var id;

        var parentIds = [];

		_.each(this.initItems, function(record) {
        	initIds.push(record.get('ObjectID'));

            var parent;
            if (record.get('Parent') != "") {
                parent = record.get('Parent');
            }

            if (parent && !Ext.Array.contains(parentIds, parent)) {
                parentIds.push(parent);
            }
        });
        console.log('initIds', initIds);

        _.each(this.endItems, function(record) {
        	endIds.push(record.get('ObjectID'));

            var parent;
            if (record.get('Parent') != "") {
                parent = record.get('Parent');
            }

            if (parent && !Ext.Array.contains(parentIds, parent)) {
                parentIds.push(parent);
            }
        });
        console.log('endIds', endIds);



        var initPromise = this._loadInitStories(initIds);
        var endPromise = this._loadEndStories(endIds);

        var promise = this._loadParentNames(parentIds);
        Deft.Promise.all([promise, initPromise, endPromise]).then({
            success: function(records) {
                console.log('promises:', records);
                var parentNames = records[0];

                //find features not planned / items on endItems that were not included in initItems
                _.each(this.endItems, function(record) {
                    var id = record.get('ObjectID');
                    var state = record.get('State');

                    var planned = true;
                    var completed = false;

                    //console.log('checking if', id, 'exists in', initIds);
                    if (!Ext.Array.contains(initIds, id)) {
                        planned = false;
                    }

                    if (state == 'Done' || state == 'Staging') {
                        completed = true;
                    }

                    endFeatures.push({
                        _ref: '/portfolioitem/feature/' + id,
                        Name: record.get('Name'),
                        FormattedID: record.get('FormattedID'),
                        State: record.get('State'),
                        PercentDoneByStoryPlanEstimate: record.get('PercentDoneByStoryPlanEstimate'),
                        Planned: planned,
                        Parent: parentNames.get(record.get('Parent')),
                        Completed: completed,
                        LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal'),
                        LeafStoryCount: record.get('LeafStoryCount'),
                        PreliminaryEstimate: record.get('PreliminaryEstimate'),
                        AcceptedLeafStoryCount: record.get('AcceptedLeafStoryCount'),
                        AcceptedLeafStoryPlanEstimateTotal: record.get('AcceptedLeafStoryPlanEstimateTotal'),
                        ActualEndDate: record.get('ActualEndDate')
                        
                    });
                }, this);


                //find feature that were not delivered / items on initItems that were not included in endItems.
                _.each(this.initItems, function(record) {
                    id = record.get('ObjectID');
                    var removed = false;

                    //console.log('checking if', id, 'exists in', endIds);
                    if (!Ext.Array.contains(endIds, id)) {
                        removed = true;
                    }

                    initFeatures.push({
                        _ref: '/portfolioitem/feature/' + id,
                        Name: record.get('Name'),
                        FormattedID: record.get('FormattedID'),
                        State: record.get('State'),
                        PercentDoneByStoryPlanEstimate: record.get('PercentDoneByStoryPlanEstimate'),
                        Removed: removed,
                        Parent: parentNames.get(record.get('Parent')),
                        LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal'),
                        LeafStoryCount: record.get('LeafStoryCount'),
                        PreliminaryEstimate: record.get('PreliminaryEstimate')
                        
                    });
                }, this);

                
                var initStore = Ext.create('Rally.data.custom.Store', {
                    data: initFeatures,
                    pageSize: 10000
                });

                var endStore = Ext.create('Rally.data.custom.Store', {
                    data: endFeatures,
                    pageSize: 10000
                });


                var initStories = records[1];
                var endStories = records[2];
                this._createSummaryGrid(initFeatures, endFeatures, initStories, endStories);
                this._createInitGrid(initStore, '#childPanel1');
                this._createEndGrid(endStore, '#childPanel2');

                this.myMask.hide();
            },
            failure: function(error) {
                console.log('error:', error);
            },
            scope: this
        });
    },


    _loadInitStories: function(initFeatureIds) {
        var deferred = Ext.create('Deft.Deferred');
        console.log('loading init stories', this.initDate, this.projectId);

        var initFilter = [{
            property: '__At',
            value: this.initDate
        }, {
            property : '_ProjectHierarchy',
            value: this.projectId
        },{
            property: '_TypeHierarchy',
            value: 'HierarchicalRequirement'
        }, {
            property : 'PortfolioItem',
            operator: 'in',
            value: initFeatureIds
        }];


        var initStoriesStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch : ['Name',
                'FormattedID',
                'ObjectID',
                'ScheduleState',
                'PlanEstimate',
                "_ValidFrom",
                "_ValidTo"
            ],
            hydrate: ['ScheduleState'],
            filters: initFilter,
            autoLoad: true,
            limit: Infinity,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],

            listeners: {
                load: function(store, data, success) {
                    console.log('stories data loaded:', data);
                    var initStoryIds = [];
                    _.each(data, function(story) {
                        initStoryIds.push(story.get('ObjectID'));
                    });

                    deferred.resolve(data);
                },
                scope: this
            }
        });

        return deferred.promise;
    },


    _loadEndStories: function(endFeatureIds) {
        var deferred = Ext.create('Deft.Deferred');
        console.log('loading end stories', this.endDate, this.projectId);

        var initFilter = [{
            property: '__At',
            value: this.endDate
        }, {
            property : '_ProjectHierarchy',
            value: this.projectId
        },{
            property: '_TypeHierarchy',
            value: 'HierarchicalRequirement'
        }, {
            property : 'PortfolioItem',
            operator: 'in',
            value: endFeatureIds
        }];


        var endStoriesStore = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch : ['Name',
                'FormattedID',
                'ObjectID',
                'ScheduleState',
                'PlanEstimate',
                "_ValidFrom",
                "_ValidTo"
            ],
            hydrate: ['ScheduleState'],
            filters: initFilter,
            autoLoad: true,
            limit: Infinity,
            sorters: [{
                property: 'ObjectID',
                direction: 'ASC'
            }],

            listeners: {
                load: function(store, data, success) {
                    console.log('end stories data loaded:', data);
                    var endStoryIds = [];
                    _.each(data, function(story) {
                        endStoryIds.push(story.get('ObjectID'));
                    });

                    deferred.resolve(data);
                },
                scope: this
            }
        });

        return deferred.promise;
    },


    _loadParentNames: function(parentIds) {
        var parentNames = new Ext.util.MixedCollection();
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'PortfolioItem/Initiative',
            autoLoad: true,
            fetch: ['Name', 'ObjectID', 'FormattedID'],
            context: {
                projectScopeUp: false,
                projectScopeDown: true,
                project: null //null to search all workspace
            },
            filters: [{
                property: 'ObjectID',
                operator: 'in',
                value: parentIds
            }],
            limit: Infinity,
            listeners: {
                load: function(store, data, success) {
                    _.each(data, function(record) {
                        var parentName = record.get('FormattedID') + ' - ' + record.get('Name');
                        parentNames.add(record.get('ObjectID'), parentName);
                    });

                    deferred.resolve(parentNames);
                }
            }, scope: this
        });

        return deferred.promise;
    },


    _loadPreliminaryEstimates: function() {
        var estimates = new Ext.util.MixedCollection();
        var deferred = Ext.create('Deft.Deferred');

        Ext.create('Rally.data.wsapi.Store', {
            model: 'PreliminaryEstimate',
            autoLoad: true,
            fetch: ['Name', 'ObjectID', 'Value'],
            context: {
                projectScopeUp: false,
                projectScopeDown: true,
                project: null //null to search all workspace
            },
            limit: Infinity,
            listeners: {
                load: function(store, data, success) {
                    _.each(data, function(record) {
                        var estimateValue = record.get('Value');
                        estimates.add(record.get('ObjectID'), estimateValue);
                    });

                    deferred.resolve(estimates);
                }
            }, scope: this
        });

        return deferred.promise;
    },


    _createInitGrid: function(myStore, panel) {
		var grid = Ext.create('Rally.ui.grid.Grid', {
			showRowActionsColumn: false,
			showPagingToolbar: false,
			enableEditing: false,
    		itemId : ''+panel+'Grid',
    		store: myStore,

    		columnCfgs: [
                {
                	xtype: 'templatecolumn',
                    text: 'ID',
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Parent',
                    dataIndex: 'Parent',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Leaf Story Plan Estimate Total', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Feature State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                },
                {
                	xtype: 'templatecolumn',
                    text: 'Percent Done By Story Plan Estimate', 
                    dataIndex: 'PercentDoneByStoryPlanEstimate',
                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })                 
                }
            ],

            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Removed') == true) {
			    		//console.log('changing css for records', record, 'index', rowIndex);
			    		return 'attention';
			    	}
    			}
			}
        });

		//this.add(grid);
    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
    },


    _createEndGrid: function(myStore, panel) {
		var grid = Ext.create('Rally.ui.grid.Grid', {
			showRowActionsColumn: false,
			showPagingToolbar: false,
			enableEditing: false,
    		itemId : ''+panel+'Grid',
    		id : ''+panel+'Grid',
    		store: myStore,
    		columnCfgs: [
                {
                	xtype: 'templatecolumn',
                    text: 'ID', 
                    dataIndex: 'FormattedID',
                    tdCls: 'x-change-cell',
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name', 
                    dataIndex: 'Name',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Parent',
                    dataIndex: 'Parent',
                    flex: 1,
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Leaf Story Plan Estimate Total', 
                    dataIndex: 'LeafStoryPlanEstimateTotal',
                    tdCls: 'x-change-cell'
                },
                {
                    text: 'Feature State', 
                    dataIndex: 'State',
                    tdCls: 'x-change-cell'
                },
                {
                    xtype: 'templatecolumn',
                    text: 'Percent Done By Story Plan Estimate', 
                    dataIndex: 'PercentDoneByStoryPlanEstimate',
                    tpl: Ext.create('Rally.ui.renderer.template.progressbar.PercentDoneByStoryPlanEstimateTemplate', {
                    	isClickable: false,
                    	showDangerNotificationFn : function() {
                    		return false;
                    	}
                    })
                },
                {
                    text: 'Actual End Date',
                    dataIndex: 'ActualEndDate',
                    xtype: 'datecolumn',
                    format   : 'm/d/Y',
                    tdCls: 'x-change-cell'
                }
            ],
            viewConfig: {
			    getRowClass: function(record, rowIndex, rowParams, store) {
			    	if (record.get('Planned') == false) {
			    		//console.log('changing css for records', record, 'index', rowIndex);
			    		return 'new-feature';
			    	}
			    	if (record.get('Completed')  == true) {
			    		return 'completed';
			    	}
    			}
			}
        });

    	var gridHolder = this.down(panel);
        gridHolder.removeAll(true);
        gridHolder.add(grid);
    },


    _createSummaryGrid: function(initItems, endItems, initStories, endStories) {
        var totalFeatureCount = 0;
        var totalPreliminaryEstimate = 0;
        var totalCountRemoved = 0;
        var totalPreliminaryEstimateRemoved = 0;

        var totalFeatureCountEnd = 0;
        var totalPreliminaryEstimateEnd = 0;
        var totalCountAdded = 0;
        var totalPreliminaryEstimateAdded = 0;
        var totalCountCompleted = 0;
        var totalPreliminaryEstimateCompleted = 0;
        var totalCountNotCompleted = 0;
        var totalPreliminaryEstimateNotCompleted = 0;

        var totalStoryCount = 0;
        var totalStoryEstimate = 0;
        var totalStoryCountRemoved = 0;
        var totalStoryEstimateRemoved = 0;

        var totalStoryCountEnd = 0;
        var totalStoryEstimateEnd = 0;
        var totalStoryCountAdded = 0;
        var totalStoryEstimateAdded = 0;
        var totalStoryCountCompleted = 0;
        var totalStoryEstimateCompleted = 0;
        var totalStoryCountNotCompleted = 0;
        var totalStoryEstimateNotCompleted = 0;

        var totalStoryCountAccepted = 0;
        var totalStoryEstimateAccepted = 0;


        var promise = this._loadPreliminaryEstimates();
        Deft.Promise.all([promise]).then({
            success: function(records) {
                console.log('preliminary estimates loaded', records[0]);

                var preliminaryEstimates = records[0];

                totalStoryCountRemoved = this._calculateTotalStoryCountRemoved(initStories, endStories);
                totalStoryEstimateRemoved = this._calculateTotalStoryEstimateRemoved(initStories, endStories);

                _.each(initItems, function(record) {
                    totalFeatureCount += 1;
                    totalStoryCount += record['LeafStoryCount'];
                    totalStoryEstimate += record['LeafStoryPlanEstimateTotal'];

                    if (record['PreliminaryEstimate'] != '') {
                        totalPreliminaryEstimate += preliminaryEstimates.get(record['PreliminaryEstimate']);
                    }

                    if (record['Removed']) {
                        totalCountRemoved += 1;

                        if (record['PreliminaryEstimate'] != '') {                            
                            totalPreliminaryEstimateRemoved += preliminaryEstimates.get(record['PreliminaryEstimate']);
                        }
                    }
                });

                totalStoryCountAdded = this._calculateTotalStoryCountAdded(initStories, endStories);
                totalStoryEstimateAdded = this._calculateTotalStoryEstimateAdded(initStories, endStories);

                _.each(endItems, function(record) {
                    totalFeatureCountEnd += 1;
                    totalStoryCountEnd += record['LeafStoryCount'];
                    totalStoryEstimateEnd += record['LeafStoryPlanEstimateTotal'];

                    totalStoryCountAccepted += record['AcceptedLeafStoryCount'];
                    totalStoryEstimateAccepted += record['AcceptedLeafStoryPlanEstimateTotal'];

                    if (record['PreliminaryEstimate'] != '') {
                        totalPreliminaryEstimateEnd += preliminaryEstimates.get(record['PreliminaryEstimate']);
                    }

                    if (!record['Planned']) {
                        totalCountAdded += 1;

                        if (record['PreliminaryEstimate'] != '') {
                            totalPreliminaryEstimateAdded += preliminaryEstimates.get(record['PreliminaryEstimate']);
                        }
                    }

                    if (record['State'] == 'Staging' || record['State'] == 'Done') {
                        totalCountCompleted += 1;
                        totalStoryCountCompleted += record['LeafStoryCount'];
                        totalStoryEstimateCompleted += record['LeafStoryPlanEstimateTotal'];

                        if (record['PreliminaryEstimate'] != '') {
                            totalPreliminaryEstimateCompleted += preliminaryEstimates.get(record['PreliminaryEstimate']);
                        }
                    }


                    if (record['State'] != 'Staging' && record['State'] != 'Done') {
                        totalCountNotCompleted += 1;

                        if (record['PreliminaryEstimate'] != '') {
                            totalPreliminaryEstimateNotCompleted += preliminaryEstimates.get(record['PreliminaryEstimate']);
                        }
                    }
                });

                totalStoryCountNotCompleted = totalStoryCountEnd - totalStoryCountAccepted;
                totalStoryEstimateNotCompleted = totalStoryEstimateEnd - totalStoryEstimateAccepted;

                var data = [];
                data.push({
                    totalFeatureCount: totalFeatureCount,
                    totalPreliminaryEstimate: totalPreliminaryEstimate,
                    totalCountRemoved: totalCountRemoved,
                    totalPreliminaryEstimateRemoved: totalPreliminaryEstimateRemoved,

                    totalFeatureCountEnd: totalFeatureCountEnd,
                    totalPreliminaryEstimateEnd: totalPreliminaryEstimateEnd,
                    totalCountAdded: totalCountAdded,
                    totalPreliminaryEstimateAdded: totalPreliminaryEstimateAdded,
                    totalCountCompleted: totalCountCompleted,
                    totalPreliminaryEstimateCompleted: totalPreliminaryEstimateCompleted,
                    totalCountNotCompleted: totalCountNotCompleted,
                    totalPreliminaryEstimateNotCompleted: totalPreliminaryEstimateNotCompleted,

                    totalStoryCount: totalStoryCount,
                    totalStoryEstimate: totalStoryEstimate,
                    totalStoryCountRemoved: totalStoryCountRemoved,
                    totalStoryEstimateRemoved: totalStoryEstimateRemoved,

                    totalStoryCountEnd: totalStoryCountEnd,
                    totalStoryEstimateEnd: totalStoryEstimateEnd,
                    totalStoryCountAdded: totalStoryCountAdded,
                    totalStoryEstimateAdded: totalStoryEstimateAdded,
                    totalStoryCountCompleted: totalStoryCountCompleted,
                    totalStoryEstimateCompleted: totalStoryEstimateCompleted,

                    totalStoryCountNotCompleted: totalStoryCountNotCompleted,
                    totalStoryEstimateNotCompleted: totalStoryEstimateNotCompleted
                });

                var store = Ext.create('Ext.data.JsonStore', {
                    fields: ['totalFeatureCount', 
                    'totalPreliminaryEstimate',
                    'totalCountRemoved', 
                    'totalPreliminaryEstimateRemoved',

                    'totalFeatureCountEnd',
                    'totalPreliminaryEstimateEnd',
                    'totalCountAdded', 
                    'totalPreliminaryEstimateAdded',
                    'totalCountCompleted',
                    'totalPreliminaryEstimateCompleted',
                    'totalCountNotCompleted',
                    'totalPreliminaryEstimateNotCompleted',

                    'totalStoryCount',
                    'totalStoryEstimate',
                    'totalStoryCountRemoved',
                    'totalStoryEstimateRemoved',

                    'totalStoryCountEnd',
                    'totalStoryEstimateEnd',
                    'totalStoryCountAdded',
                    'totalStoryEstimateAdded',
                    'totalStoryCountCompleted',
                    'totalStoryEstimateCompleted',

                    'totalStoryCountNotCompleted',
                    'totalStoryEstimateNotCompleted']
                });


                store.loadData(data);
                this._createFeatureSummaryGrid(store);
                this._createStorySummaryGrid(store);
            },
            failure: function(error) {
                console.log('error:', error);
            },
            scope: this
        });        
    },


    _calculateTotalStoryCountRemoved: function(initStories, endStories) {
        var initIds = [];
        var endIds = [];

        var totalStoryCountRemoved = 0;
        
        _.each(initStories, function(story) {
            initIds.push(story.get('ObjectID'));
        });

        _.each(endStories, function(story) {
            endIds.push(story.get('ObjectID'));
        });

        _.each(initStories, function(story) {
            if (!Ext.Array.contains(endIds, story.get('ObjectID'))) {
                totalStoryCountRemoved += 1;
            }
        });

        return totalStoryCountRemoved;
    },


    _calculateTotalStoryEstimateRemoved: function(initStories, endStories) {
        var initIds = [];
        var endIds = [];

        var totalEstimateRemoved = 0;

        var totalEstimate = 0;
        var totalEstimateEnd =0;
        
        _.each(initStories, function(story) {
            initIds.push(story.get('ObjectID'));
            totalEstimate +=story.get('PlanEstimate');
        });

        _.each(endStories, function(story) {
            endIds.push(story.get('ObjectID'));
            totalEstimateEnd +=story.get('PlanEstimate');
        });

        _.each(initStories, function(story) {
            if (!Ext.Array.contains(endIds, story.get('ObjectID'))) {
                totalEstimateRemoved += story.get('PlanEstimate');
            }
        });

        console.log('total story estimate', totalEstimate);
        console.log('total story estimate end ', totalEstimateEnd);

        return totalEstimateRemoved;
    },


    _calculateTotalStoryCountAdded: function(initStories, endStories) {
        var initIds = [];
        var endIds = [];

        var totalStoryCountAdded = 0;
        
        _.each(initStories, function(story) {
            initIds.push(story.get('ObjectID'));
        });

        _.each(endStories, function(story) {
            endIds.push(story.get('ObjectID'));
        });

        _.each(endStories, function(story) {
            if (!Ext.Array.contains(initIds, story.get('ObjectID'))) {
                totalStoryCountAdded += 1;
            }
        });

        return totalStoryCountAdded;
    },


    _calculateTotalStoryEstimateAdded: function(initStories, endStories) {
        var initIds = [];
        var endIds = [];

        var totalEstimateAdded = 0;
        
        _.each(initStories, function(story) {
            initIds.push(story.get('ObjectID'));
        });

        _.each(endStories, function(story) {
            endIds.push(story.get('ObjectID'));
        });

        _.each(endStories, function(story) {
            if (!Ext.Array.contains(initIds, story.get('ObjectID'))) {
                totalEstimateAdded += story.get('PlanEstimate');
            }
        });

        return totalEstimateAdded;
    },


    _createFeatureSummaryGrid: function(store) {
        var featureGrid = Ext.create('Ext.grid.Panel', {
            store: store,
            height: 85,
            forceFit: true,
            viewConfig: {
                //stripeRows: true,
                enableTextSelection: true
            },
            columns: [{
                text: 'Start Items',
                flex: 1,
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalFeatureCount'
                }, {
                    text: 'Total Preliminary Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimate'
                }, {
                    text: 'Total Count Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountRemoved'
                }, {
                    text: 'Total Preliminary Estimate Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimateRemoved'
                }]
            }, {
                text: 'End Items',
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalFeatureCountEnd'
                }, {
                    text: 'Total Preliminary Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimateEnd'
                }, {
                    text: 'Total Count Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountAdded'
                }, {
                    text: 'Total Preliminary Estimate Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimateAdded'
                }, {
                    text: 'Total Count Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountCompleted'
                }, {
                    text: 'Total Preliminary Estimate Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimateCompleted'
                }, {
                    text: 'Total Count Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountNotCompleted'
                }, {
                    text: 'Total Preliminary Estimate Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalPreliminaryEstimateNotCompleted'
                }]
            }]
        });

        this.down('#featureSummaryPanel').removeAll(true);
        this.down('#featureSummaryPanel').add(featureGrid);
    }, 


    _createStorySummaryGrid: function(store) {
        var storyGrid = Ext.create('Ext.grid.Panel', {
            store: store,
            height: 85,
            forceFit: true,
            viewConfig: {
                //stripeRows: true,
                enableTextSelection: true
            },
            columns: [{
                text: 'Start Items',
                flex: 1,
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCount'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimate'
                }, {
                    text: 'Total Count Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCountRemoved'
                }, {
                    text: 'Total Estimate Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimateRemoved'
                }]
            }, {
                text: 'End Items',
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCountEnd'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimateEnd'
                }, {
                    text: 'Total Count Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCountAdded'
                }, {
                    text: 'Total Estimate Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimateAdded'
                }, {
                    text: 'Total Count Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCountCompleted'
                }, {
                    text: 'Total Estimate Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimateCompleted'
                }, {
                    text: 'Total Story Count Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryCountNotCompleted'
                }, {
                    text: 'Total Story Estimate Not Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalStoryEstimateNotCompleted'
                }]
            }]
        });
        

        this.down('#storySummaryPanel').removeAll(true);
        this.down('#storySummaryPanel').add(storyGrid);
    }, 
});
