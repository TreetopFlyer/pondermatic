var express = require('express');
var router = express.Router();

router.get("/:id", function(inReq, inRes){
    inRes.render("editor", {_id:inReq.params.id});
});

module.exports = router;