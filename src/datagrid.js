/*jshint node: true */
"use strict";

var EventEmitter = require('events').EventEmitter,
    Pagination   = require('edcs-pagination'),
    Searchbar    = require('edcs-searchbar'),
    handlebars   = require('handlebars'),
    superagent   = require('superagent'),
    url          = require('edcs-url'),
    history      = require('edcs-history');

var Datagrid = function (component) {
    var that = this;

    /**
     * Whether or not this is the first time data has been loaded into the datagrid.
     *
     * @type {boolean}
     */
    that.firstLoad = true;

    /**
     * Default page number constant.
     *
     * @type {number}
     */
    that.DEFAULT_PAGE = 1;

    /**
     * Default number of rows constant.
     *
     * @type {number}
     */
    that.DEFAULT_ROWS = 15;

    /**
     * Default sort direction for columns.
     *
     * @type {string}
     */
    that.DEFAULT_SORT = 'desc';

    /**
     * The most recent JSON payload requested from the server.
     *
     * @type {null|object}
     */
    that.data = null;

    /**
     * Event emitter for this datagrid.
     *
     * @type {*|n}
     */
    that.emitter = new EventEmitter();

    /**
     * The pagination object for this datagrid.
     *
     * @type {Pagination}
     */
    that.pagination = new Pagination();

    /**
     * The searchbar object for this datagrid.
     *
     * @type {Searchbar}
     */
    that.searchbar = new Searchbar();

    /**
     * The component this module is modifying.
     */
    that.component = component;

    /**
     * The header toolbar where the search form lives.
     *
     * @type {Element}
     */
    that.toolbarHeader = document.createElement('div');

    /**
     * The footer toolbar where the pagination links live.
     *
     * @type {Element}
     */
    that.toolbarFooter = document.createElement('div');

    /**
     * The URL of the JSON endpoint this datagrid should load it's data from.
     */
    that.src = this.loadSrc();

    /**
     * The template used to create the datagrid rows.
     */
    that.rowsTemplate = this.loadRowsTemplate();

    /**
     * The parameters used when requesting JSON from the server.
     */
    that.requestParams = this.loadRequestParams();

    /**
     * Values used when the sort direction needs to be reversed.
     */
    that.replacementSorts = {
        asc: 'desc',
        desc: 'asc'
    };

    /**
     * Event handler for when JSON data has been loaded from the server.
     */
    that.emitter.on('data-ready', function(data){
        that.data = data;
        that.parseRows(data.body);
        that.parsePagination();

        if (this.firstLoad) {
            history.replace(that.requestParams);
        } else {
            history.push(that.requestParams);
        }
    });

    /**
     * Event handler for when a column header has been clicked to change sort direction.
     */
    that.emitter.on('sort-request', function(el){
        that.showLoadingOverlay();

        var sortColumn = el.getAttribute('data-column');
        var sortDirection = el.getAttribute('data-sort');

        if (sortDirection === null) {
            sortDirection = that.DEFAULT_SORT;
        } else {
            sortDirection = that.replacementSorts[sortDirection];
        }

        that.requestParams.sortColumn = sortColumn;
        that.requestParams.sortDirection = sortDirection;

        that.setSortHeaders();
        that.loadData();
    });

    /**
     * Event handler for when a user clicks on pagination link which belongs to this datagrid.
     */
    that.pagination.emitter.on('pagination-request', function (el) {
        that.showLoadingOverlay();

        var page = el.getAttribute('data-page');

        that.requestParams.page = parseInt(page);
        that.loadData();
    });

    /**
     * Event handler for when a user submits the search form.
     */
    that.searchbar.emitter.on('search-request', function (search) {
        that.showLoadingOverlay();

        that.requestParams.page = 1;
        that.requestParams.search = search.value;
        that.loadData();
    });

    /**
     * Do all the things.
     */
    that.appendToolbars();
    that.parseSearchbar();
    that.wrapHeaders();
    that.showLoadingOverlay();
    that.setSortHeaders();
    that.loadData();
};

Datagrid.prototype = {

    /**
     * Loads the JSON endpont URL from the components data attribute.
     *
     * @returns {string}
     */
    loadSrc: function () {
        return this.component.getAttribute('data-src');
    },

    /**
     * Loads the mustache template for the datagrid rows.
     *
     * @returns {string}
     */
    loadRowsTemplate: function () {
        var location = this.component.getAttribute('data-rows-template');

        return document.querySelector(location).innerHTML;
    },

    /**
     * Generates the request parameter object used to grab data from the server.
     *
     * @returns {{page: (*|number), rowCount: (*|number), sortColumn: (*|string), sortDirection: (*|string)}}
     */
    loadRequestParams: function () {
        var params = {
            page: this.getPageNumber(),
            rowCount: this.getRowCount(),
            sortColumn: this.getSortColumn(),
            sortDirection: this.getSortDirection(),
        };

        var search = this.getSearchTerm();

        if (search) {
            params.search = search;
        }

        return params;
    },

    /**
     * Returns the current page number either from the URL or via the default value.
     *
     * @returns {number}
     */
    getPageNumber: function () {
        var page = url.readQueryString('page');

        if (page === null) {
            return this.DEFAULT_PAGE;
        }

        return parseInt(page);
    },

    /**
     * Returns the current row count either from the URL or via the default value.
     *
     * @returns {number}
     */
    getRowCount: function () {
        var rowCount = url.readQueryString('rowCount');

        if (rowCount === null) {
            return this.DEFAULT_ROWS;
        }

        return parseInt(rowCount);
    },

    /**
     * Gets the sort direction from the datagrid's data attributes or from the URL.
     *
     * @returns {string}
     */
    getSortDirection: function () {
        var sortDirection = url.readQueryString('sortDirection');

        if (sortDirection !== null) {
            return sortDirection;
        }

        var th = this.component.querySelector('th[data-sort]');

        if (th !== null) {
            return th.getAttribute('data-sort');
        }
    },

    /**
     * Gets the sort column from the datagrid's data attributes or from the URL.
     *
     * @returns {string}
     */
    getSortColumn: function () {
        var sortColumn = url.readQueryString('sortColumn');

        if (sortColumn !== null) {
            return sortColumn;
        }

        var th = this.component.querySelector('th[data-sort]');

        if (th !== null) {
            return th.getAttribute('data-column');
        }
    },

    /**
     * Gets the current search term from the URL.
     *
     * @returns {*|string}
     */
    getSearchTerm: function () {
        var search = url.readQueryString('search');

        return search;
    },

    /**
     * Shows a loading overlay when the datagrid is first loaded.
     *
     * @returns {void}
     */
    showLoadingOverlay: function () {
        var firstRow = this.component.querySelector('tbody tr:first-child');
        var columns  = this.component.querySelectorAll('thead tr th').length;
        var height;

        if (firstRow) {
            this.component.querySelector('tbody').innerHTML = null;
        }

        var tr = document.createElement('tr');
            tr.classList.add('loading');
            tr.innerHTML = '<td colspan="' + columns + '">&nbsp;</td>';

        var tbody = this.component.querySelector('tbody');
            tbody.appendChild(tr);

        firstRow = this.component.querySelector('tbody tr:first-child td');
        height = firstRow.clientHeight * this.requestParams.rowCount;

        firstRow.innerHTML = '<div class="loader"></div>';
        firstRow.setAttribute('height', height.toString());
    },

    /**
     * Loads data from the JSON endpoint.
     *
     * @returns {void}
     */
    loadData: function () {
        var that = this;

        superagent.get(that.src)
                  .query(that.requestParams)
                  .end(function (error, response) {
                      that.emitter.emit('data-ready', response);
                  });
    },

    /**
     * Adds the toolbar containers in front of and behind the datagrid table.
     *
     * @returns {void}
     */
    appendToolbars: function () {
        this.toolbarHeader.classList.add('datagrid-header');
        this.toolbarFooter.classList.add('datagrid-footer');

        this.component.parentNode.insertBefore(this.toolbarHeader, this.component);
        this.component.parentNode.insertBefore(this.toolbarFooter, this.component.nextSibling);
    },

    /**
     * Adds links to column headers so that they can be clicked to sort.
     *
     * @param component
     * @returns {void}
     */
    wrapHeaders: function () {
        var that = this;
        var ths = that.component.querySelectorAll('th');

        [].forEach.call(ths, function(th) {
            var a = document.createElement('a');
            a.innerHTML = th.innerHTML;

            th.onclick = function () {
                that.emitter.emit('sort-request', this);
            };

            th.innerHTML = null;
            th.appendChild(a);
        });
    },

    /**
     * Parses the JSON data into a HTML string.
     *
     * @returns {string}
     */
    parseRows: function (data) {
        var template = handlebars.compile(this.rowsTemplate);
        var html     = template(data);

        this.component.querySelector('tbody').innerHTML = html;
    },

    /**
     * Sets the sort direction data attribute for the current sort condition.
     *
     * @returns {void}
     */
    setSortHeaders: function () {
        var that = this;
        var ths = that.component.querySelectorAll('th');

        [].forEach.call(ths, function(th) {
            th.removeAttribute('data-sort');
        });

        var th = that.component.querySelector('th[data-column=' + that.requestParams.sortColumn + ']');

        if (th !== null) {
            th.setAttribute('data-sort', that.requestParams.sortDirection);
        }
    },

    /**
     * Loads the pagination links for this datagrid and appends them to the footer toolbar.
     *
     * @returns void
     */
    parsePagination: function () {
        this.pagination.setPage(this.requestParams.page)
                       .setPageCount(Math.round(this.data.body.total / this.data.body.rowCount))
                       .setRequestParams(JSON.parse(JSON.stringify(this.requestParams)));

        var pagination = this.pagination.parsePagination();
        var exisiting  = this.toolbarFooter.querySelector('.pagination');

        if (exisiting === null) {
            this.toolbarFooter.appendChild(pagination);
        } else {
            this.toolbarFooter.replaceChild(pagination, exisiting);
        }
    },

    /**
     * Loads the searchbar for this datagrid and appends it to the header toolbar.
     *
     * @returns {null}
     */
    parseSearchbar: function () {
        if (this.requestParams.search) {
            this.searchbar.searchTerm = this.requestParams.search;
        }

        var searchbar = this.searchbar.parseSearchbar();
        var exisiting = this.toolbarHeader.querySelector('.searchbar');

        if (exisiting === null) {
            this.toolbarHeader.appendChild(searchbar);
        } else {
            this.toolbarHeader.replaceChild(searchbar, exisiting);
        }
    }
};

module.exports = Datagrid;
