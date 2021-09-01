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
    event.Delete("message")
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
            event.Put(params.keyPrefix + k, v)
        }
    }

    // put the final query
    event.Put(params.keyPrefix + "Query", query)

    return event
}
