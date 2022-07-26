const mongoose = require('mongoose');
const uri = process.env.ATLASURI;

// connect to MongoDB Atlas
mongoose.connect(uri)
.then( () => console.log('Connected to MongoDB!'))
.catch( err => console.log(err))