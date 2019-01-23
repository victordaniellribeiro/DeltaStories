Ext.define('CustomApp', {
	extend: 'Rally.app.App',
	componentCls: 'app',
	launch: function() {

		var context = this.getContext();
		var project = context.getProject()['ObjectID'];

		// Ext.create('Rally.data.lookback.SnapshotStore', {
		// 	fetch: ['FormattedID', 'Name', 'c_Kanban', '_UnformattedID', '_TypeHierarchy'],
		// 	filters: [{
		// 		property: '__At',
		// 		value: 'current'
		// 	}, {
		// 		property: '_TypeHierarchy',
		// 		value: 'PortfolioItem/Feature'
		// 	}, {
		// 		property: '_ProjectHierarchy',
		// 		//value    :   14020264660 //P1
		// 		value: project
		// 	}],
		// 	hydrate: ['_TypeHierarchy', 'c_Kanban'],
		// 	listeners: {
		// 		load: this._onDataLoaded,
		// 		scope: this
		// 	}
		// }).load({
		// 	params: {
		// 		compress: true,
		// 		removeUnauthorizedSnapshots: true
		// 	}
		// });



		Ext.create('Rally.data.wsapi.Store', {
			model: 'PortfolioItem/Feature',
			autoLoad: true,
			listeners: {
				load: this._onDataLoaded,
				scope: this
			},
			fetch: ['FormattedID', 'Name', 'ScheduleState', 'Tasks', 'Defects']
		});
	},
	_onDataLoaded: function(store, data) {
		var records = _.map(data, function(record) {
			//Perform custom actions with the data here
			//Calculations, etc.
			return Ext.apply({
				//_ref: "/portfolioitem/feature/57148305863"
				//TaskCount: record.get('Tasks').Count
			}, record.getData());
		});

		this.add({
			xtype: 'rallygrid',
			showPagingToolbar: false,
			showRowActionsColumn: false,
			editable: false,

			store: Ext.create('Rally.data.custom.Store', {
				data: records
			}),

			columnCfgs: [{
				xtype: 'templatecolumn',
				text: 'ID',
				dataIndex: 'FormattedID',
				width: 100,
				tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
			}, {
				text: 'Name',
				dataIndex: 'Name',
				flex: 1
			}, {
				text: 'Schedule State',
				dataIndex: 'ScheduleState'
			}, {
				text: '# of Tasks',
				dataIndex: 'TaskCount'
			}, {
				text: '# of Defects',
				dataIndex: 'Defects',
				renderer: function(value) {
					return value.Count;
				}
			}]
		});
	}
});