//taken from WebAPIBasicOperations.js sample @ https://msdn.microsoft.com/en-us/library/mt770365.aspx

var Sdk = window.Sdk || {};
var webAPIPath = "/api/data/v8.1";      // Path to the web API.

/**
 * @function getClientUrl 
 * @description Get the client URL.
 * @returns {string} The client URL.
 */
Sdk.getClientUrl = function () {
    var context;
    // GetGlobalContext defined by including reference to 
    // ClientGlobalContext.js.aspx in the HTML page.
    if (typeof GetGlobalContext != "undefined")
    { context = GetGlobalContext(); }
    else
    {
        if (typeof Xrm != "undefined") {
            // Xrm.Page.context defined within the Xrm.Page object model for form scripts.
            context = Xrm.Page.context;
        }
        else { throw new Error("Context is not available."); }
    }
    return context.getClientUrl();
}

var clientUrl = Sdk.getClientUrl();     // e.g.: https://org.crm.dynamics.com

/**
 * @function request
 * @description Generic helper function to handle basic XMLHttpRequest calls.
 * @param {string} action - The request action. String is case-sensitive.
 * @param {string} uri - An absolute or relative URI. Relative URI starts with a "/".
 * @param {object} data - An object representing an entity. Required for create and update action.
 * @param {boolean} formattedValue - If "true" then include formatted value; "false" otherwise.
 *    For more info on formatted value, see:
 *    https://msdn.microsoft.com/en-us/library/gg334767.aspx#bkmk_includeFormattedValues
 * @param {number} maxPageSize - Indicate the page size. Default is 10 if not defined.
 * @returns {Promise} - A Promise that returns either the request object or an error object.
 */
Sdk.request = function (action, uri, data, formattedValue, maxPageSize) {
    if (!RegExp(action, "g").test("POST PATCH PUT GET DELETE")) { // Expected action verbs.
        throw new Error("Sdk.request: action parameter must be one of the following: " +
            "POST, PATCH, PUT, GET, or DELETE.");
    }
    if (!typeof uri === "string") {
        throw new Error("Sdk.request: uri parameter must be a string.");
    }
    if ((RegExp(action, "g").test("POST PATCH PUT")) && (data === null || data === undefined)) {
        throw new Error("Sdk.request: data parameter must not be null for operations that create or modify data.");
    }
    if (maxPageSize === null || maxPageSize === undefined) {
        maxPageSize = 10; // Default limit is 10 entities per page.
    }

    // Construct a fully qualified URI if a relative URI is passed in.
    if (uri.charAt(0) === "/") {
        uri = clientUrl + webAPIPath + uri;
    }

    return new Promise(function (resolve, reject) {
        var request = new XMLHttpRequest(); 
        request.open(action, encodeURI(uri), true);
        request.setRequestHeader("OData-MaxVersion", "4.0");
        request.setRequestHeader("OData-Version", "4.0");
        request.setRequestHeader("Accept", "application/json");
        request.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        request.setRequestHeader("Prefer", "odata.maxpagesize=" + maxPageSize);
        if (formattedValue) {
            request.setRequestHeader("Prefer",
                "odata.include-annotations=OData.Community.Display.V1.FormattedValue");
        }
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                request.onreadystatechange = null;
                switch (this.status) {
                    case 200: // Success with content returned in response body.
                    case 204: // Success with no content returned in response body.
                        resolve(this);
                        break;
                    default: // All other statuses are unexpected so are treated like errors.
                        var error;
                        try {
                            error = JSON.parse(request.response).error;
                        } catch (e) {
                            error = new Error("Unexpected Error");
                        }
                        reject(error);
                        break;
                }
            }
        };
        request.send(JSON.stringify(data));
    });
};

/**
 * @funnction output
 * @description Generic helper function to output data to console.
 * @param {array} collection - Array of entities.
 * @param {string} label - Text label for what the collection contains.
 * @param {array} properties - Array of properties appropriate for the collection.
 */
Sdk.output = function (collection, label, properties) {
    console.log(label);
    collection.forEach(function (row, i) {
        var prop = [];
        properties.forEach(function (p) {
            var f = p + "@OData.Community.Display.V1.FormattedValue";
            prop.push((row[f] ? row[f] : row[p])); // Get formatted value if one exists for this property.
        })
        console.log("\t%s) %s", i + 1, prop.join(", "));
    });
}



