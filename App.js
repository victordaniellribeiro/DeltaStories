Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {
        //API Docs: https://help.rallydev.com/apps/2.1/doc/    
        var context =  this.getContext();
        var project = context.getProject()['ObjectID'];        
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

        var summaryPanel = Ext.create('Ext.panel.Panel', {
            title: 'Summary',
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 5
            },
            padding: 5,
            itemId: 'summaryPanel',
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
		    target : mainPanel
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

        this.add(summaryPanel);
        this.add(mainPanel);

    },

    _doSearch: function(initDate, endDate, projectId, baseReleaseName, baseReleaseId) {
    	//gather all releases 
    	console.log('parent release name: ', baseReleaseName);
    	console.log('looking for:', initDate, endDate, projectId);


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
		    fetch: ['Description', 'Name', 'ObjectID']
		});
    },

    _loadInitData: function () {
    	console.log('loading init stories');
    	//console.log('filters:', this.filtersInit);
    	var store = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch    : ['Name', 'FormattedID', 'LeafStoryPlanEstimateTotal', 'State', 'Parent', 'PercentDoneByStoryPlanEstimate', "_ValidFrom", "_ValidTo"],
            filters : this.filtersInit,
            autoLoad: true,
	        sorters : [
		        {
		            property: 'ObjectID',
		            direction: 'ASC'
	        	}
	        ],

            hydrate: ['State'],

            listeners: {
                load: function(store, data, success) {
                	//console.log('Init Store', store);
                	this.initItems = data;
                	this._loadEndData();
                },
                scope: this
            }
        });
    },

    _loadEndData: function() {
        console.log('loading end stories');
        var store2 = Ext.create('Rally.data.lookback.SnapshotStore', {
            fetch: ['Name',
                'FormattedID',
                'LeafStoryPlanEstimateTotal',
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

            hydrate: ['State'],

            listeners: {
                load: function(store, data, success) {
                    this.endItems = data;
                    this._onStoriesLoaded();
                    this.myMask.hide();
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

        var promise = this._loadParentNames(parentIds);
        Deft.Promise.all([promise]).then({
            success: function(records) {
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
                        LeafStoryPlanEstimateTotal: record.get('LeafStoryPlanEstimateTotal')
                        
                    });
                }, this);

                
                var initStore = Ext.create('Rally.data.custom.Store', {
                    data: initFeatures,
                    pageSize: 1000
                });

                var endStore = Ext.create('Rally.data.custom.Store', {
                    data: endFeatures,
                    pageSize: 1000
                });

                this._createSummaryGrid(initFeatures, endFeatures);
                this._createInitGrid(initStore, '#childPanel1');
                this._createEndGrid(endStore, '#childPanel2');
            },
            failure: function(error) {
                console.log('error:', error);
            },
            scope: this
        });
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


    _createSummaryGrid: function(initItems, endItems) {
        var totalCount = 0;
        var totalEstimate = 0;
        var totalCountEnd = 0;
        var totalEstimateEnd = 0;
        var totalCountRemoved = 0;
        var totalEstimateRemoved = 0;
        var totalCountAdded = 0;
        var totalEstimateAdded = 0;
        var totalCountCompleted = 0;
        var totalEstimateCompleted = 0;
        var totalStoryCountNotCompleted = 0;
        var totalStoryEstimateNotCompleted = 0;
        var totalStoryCountAccepted = 0;
        var totalStoryEstimateAccepted = 0;
        var totalStoryCount = 0;

        _.each(initItems, function(record) {
            totalCount += 1;
            totalEstimate += record['LeafStoryPlanEstimateTotal'];

            if (record['Removed']) {
                totalCountRemoved += 1;
                totalEstimateRemoved += record['LeafStoryPlanEstimateTotal'];
            }
        });

        _.each(endItems, function(record) {
            totalCountEnd += 1;
            totalEstimateEnd += record['LeafStoryPlanEstimateTotal'];
            totalStoryCount += record['LeafStoryCount'];

            totalStoryCountAccepted += record['AcceptedLeafStoryCount'];
            totalStoryEstimateAccepted += record['AcceptedLeafStoryPlanEstimateTotal'];

            if (!record['Planned']) {
                totalCountAdded += 1;
                totalEstimateAdded += record['LeafStoryPlanEstimateTotal'];
            }

            if (record['State'] == 'Staging' || record['State'] == 'Done') {
                totalCountCompleted += 1;
                totalEstimateCompleted += record['LeafStoryPlanEstimateTotal'];
            }
        });

        totalStoryCountNotCompleted = totalStoryCount - totalStoryCountAccepted;
        totalStoryEstimateNotCompleted = totalEstimateEnd - totalStoryEstimateAccepted;

        var data = [];
        data.push({
            totalCount: totalCount,
            totalEstimate: totalEstimate,
            totalCountRemoved: totalCountRemoved,
            totalEstimateRemoved: totalEstimateRemoved,
            totalCountEnd: totalCountEnd,
            totalEstimateEnd: totalEstimateEnd,
            totalCountAdded: totalCountAdded,
            totalEstimateAdded: totalEstimateAdded,
            totalCountCompleted: totalCountCompleted,
            totalEstimateCompleted: totalEstimateCompleted,
            totalStoryCountNotCompleted: totalStoryCountNotCompleted,
            totalStoryEstimateNotCompleted: totalStoryEstimateNotCompleted
        });

        var store = Ext.create('Ext.data.JsonStore', {
            fields: ['totalCount', 
            'totalEstimate', 
            'totalCountRemoved', 
            'totalEstimateRemoved', 
            'totalCountEnd', 
            'totalEstimateEnd', 
            'totalCountAdded', 
            'totalEstimateAdded',
            'totalCountCompleted',
            'totalEstimateCompleted',
            'totalStoryCountNotCompleted',
            'totalStoryEstimateNotCompleted']
        });


        store.loadData(data);

        var grid = Ext.create('Ext.grid.Panel', {
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
                    dataIndex: 'totalCount'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimate'
                }, {
                    text: 'Total Count Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountRemoved'
                }, {
                    text: 'Total Estimate Removed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateRemoved'
                }]
            }, {
                text: 'End Items',
                columns: [{
                    text: 'Total Count',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountEnd'
                }, {
                    text: 'Total Estimate',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateEnd'
                }, {
                    text: 'Total Count Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountAdded'
                }, {
                    text: 'Total Estimate Added',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateAdded'
                }, {
                    text: 'Total Count Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalCountCompleted'
                }, {
                    text: 'Total Estimate Completed',
                    flex: 1,
                    sortable: false,
                    dataIndex: 'totalEstimateCompleted'
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

        this.down('#summaryPanel').removeAll(true);
        this.down('#summaryPanel').add(grid);
    }
});
