var params = {
    lineRegex: /[^\r\n]+/g,
    kvRegex: /(\S+): (\S+)/g,
    keyPrefix: "tidb.slowlog."
};

function register(scriptParams) {
    params = scriptParams;
}

function process(event) {
    // get the message
    var m0 = event.Get("message")
    if (m0 === null) {
        event.Cancel();
        return;
    }

    // split lines
    var lines = m0.match(params.lineRegex);
    if (lines.length < 3) {
        event.Cancel();
        return;
    }

    function safePut(k, v) {
        event.Put(params.keyPrefix + k, v)
    }

    // a var handling multiline query
    var query = ""

    // extract k-v's
    for (var i = 0; i < lines.length; i++) {
        // for each line in a slow log
        // if a line does not start with a "#" char, treat it as a part of query
        if (lines[i].lastIndexOf("#", 0) !== 0) {
            query = query + lines[i]
            continue
        }
        var match;
        while (match = params.kvRegex.exec(lines[i])) {
            // for each k-v in a line
            if (match.length !== 3) {
                event.Cancel();
                return;
            }
            var k = match[1]
            var v = match[2]
            if (k === "Txn_start_ts" || k === "Conn_ID") {
                // no need to parse special keys
                safePut(k, v)
                continue
            }
            // try to parse other fields to numbers
            if (isSimpleNumber(v)) {
                safePut(k, parseFloat(v))
            } else {
                safePut(k, v)
            }
        }
    }

    // put the final query
    safePut("Query", query)

    event.Delete("message")
    return event
}

function isSimpleNumber(str) {
    if (typeof str != "string") return false
    return !isNaN(str) && !isNaN(parseFloat(str))
}
