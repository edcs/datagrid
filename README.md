# Datagrid

A little module for building paginated, searchable and sortable datagrid tables.

## Install

### NPM + Browserify (recommended)

First install Cycl in your project root.

```bash
$ npm install edcs-datagrid
```

Then include in your module using `require()`.

```javascript
var Datagrid = require('edcs-datagrid');
```

## The JSON Endpoint

This nodule requires a JSON endpoint to populate the datagrid. The module will fire an HTTP `GET` request to your endpoint with these arguments:

 * `page`
   * This is the current page of data that the JSON endpoint should return.
 * `rowCount`
   * This is the number of rows that the JSON endpoint should return. 
 * `sortColumn`
   * This is the column that the JSON endpoint should sort the data by.
 * `sortDirection`
   * This is the direction that `sortColum` should be sorted by, valid values are `asc` and `desc`.
 * `search` 
   * The search term that the JSON endpoint should filter by.

The JSON endpoint should return the data in the following format:

```javascript
{
    "current": 1,
    "rowCount": 10,
    "total": 2,
    "rows": [{
        "id": 1,
        "user_fullname": "Joseph Thompson",
        "report_created_at": "Sun, 22 Jun 2014 15:52:33 +0100",
    },{
        "id": 2,
        "user_fullname": "Charlotte Simpson",
        "report_created_at": "Sun, 22 Jun 2014 15:52:33 +0100",
    }]
}    
```

The JSON parameters should contain the following values:

 * `current`
   * This is the current page of data that is being displayed.
 * `rowCount`
   * This is the number of rows of data that were returned and is used to calculate pagination links.
 * `total`
   * This is the total number of rows available from this endpoint and is used to calculate pagination links.
 * `rows`
   * This should be an array which contains objects with parameters that match up with the handlebars template and table headers you define.

## The HTML and Templates

### Setting Up The Table

Your table should use the following openning tag.

```html
<table id="datagrid" data-src="http//my.app/path/to/data.json" data-rows-template="#datagrid-rows">
```

The src is the JSON endpoint that the the datagrid module can load table data from. The rows template is a query selector string which defines the location of the handlebars template used to pupulate the table.

The table should be correctly formatted with `<thead>` and `<tbody>` sections like so:

```html
<table id="datagrid" data-src="http//my.app/path/to/data.json" data-rows-template="#datagrid-rows">
    <thead>
        <tr>
            <th data-column"id" data-sort="asc">ID</th>
            <th data-column"user_fullname">Full Name</th>
            <th data-column"report_created_at">Created At</th>
        </tr>
    </thead>
    <tbody>
      <!-- This will be populated using a handlebars template -->
    </tbody>
</table>
```

The `<th>` tags have extra data attributes applied to them in order to interact with the datagrid module. `data-column-id` should contain the name of the parameter from the JSON endpoint that this column should display. `data-sort` should contain the default sort direction that should be applied. Sorting can only be applied to one column.

### Setting Up The Rows Template

The `<tbody>` of the table is populated using a handlebars template. This should be defined like this:

```html
<script id="datagrid-rows" type="text/x-handlebars-template">
    {{#rows}}
        <tr>
            <td>{{id}}</td>
            <td>{{user_fullname}}</td>
            <td>{{report_created_at}}</td>
        </tr>
    {{/rows}}
</script>
```

The `<tr>` should always be wrapped in `{{#rows}}` and `{{/rows}}` tags since this is the name of the array returned by the JSON endpoint. The `<td>` tags should contain references to the name of the parameters that JSON endpoint returns.

## Initializing The Datagrid

The datagrid should be intialized as a new object with the table passed to it as a DOM object like this:

```javascript
var Datagrid = require('edcs-datagrid');

document.addEventListener("DOMContentLoaded", function(event) {
    var element = document.getElementById('datagrid');
    var datagrid = new Datagrid(element);
});
```
