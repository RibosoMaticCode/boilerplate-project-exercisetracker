const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// BODY PARSER
const bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

// CONFIGUAR MONGOOSE
const mongoose = require('mongoose') // requerir modulo
mongoose.connect(process.env.MONGO_URI) // conectar a variable de entorno

// ESQUEMAS
const Schema = mongoose.Schema

const userSchema = new Schema({
  username: { type: String, required: true },
})
const User = mongoose.model("User", userSchema)

const exerciseSchema = new Schema({
  user_id: { type: String, required: true },
  username: { type: String, required: true },
  date: { type: String, required: true },
  duration: { type: Number },
  description: { type: String, required: true }
})
const Exercise = mongoose.model("Exercise", exerciseSchema)

// NUEVO USUARIO
app.post("/api/users", (req, res) => {
  const { username } = req.body;

  // Preparamos datos para guardar
  const userNew = new User({
    username: username
  })

  // Guardamos dato nuevo
  userNew.save((err, data) => {
    if (err) res.json({ error: err.message })
    else res.json({
      username: data.username,
      _id: data._id
    })
  })
})

// FUNCTION BUSCAR REGISTRO
async function findUserBy(field, value) {
  const result = await User.findOne({ [field]: value });
  return result
}

// NUEVO REGISTRO DE EJERCICIO
app.post("/api/users/:id/exercises", (req, res) => {
  const { id } = req.params
  let { description, duration, date } = req.body

  // si no esta definida fecha o esta vacia, definimos la de ahora
  if(typeof date === 'undefined' || date === "") { 
    date = new Date(); 
    date.toISOString().split('T')[0]
  }

  // Buscamos el id del usuario
  findUserBy('_id', id)
    .then(userFound => {

      // si encontramos
      if (userFound) {

        // Preparamos datos para guardar
        const exerciseNew = new Exercise({
          user_id: userFound._id,
          username: userFound.username,
          description,
          duration,
          date
        })

        // Guardamos dato nuevo
        exerciseNew.save((err, data) => {
          if (err) res.json({ error: err.message })
          else res.json({
            _id: data.user_id,
            username: data.username,
            date: (new Date(data.date)).toDateString(),
            duration: data.duration,
            description: data.description
          })
        })

      }
      // si no existe
      else {
        res.send('Unknown userId')
      }

    })
    .catch(err => {
      res.json({ error: error.message })
    })

})

// CONSULTAR TODOS LOS USUARIOS
app.get("/api/users", (req, res) => {
  User.find().exec((err, usersFound) => {
    if (usersFound) {
      res.json(usersFound)
    }
    else {
      res.json({
        error: err.message
      })
    }
  })
})

// CONSULTAR LOG DE EJERCICIO
app.get("/api/users/:id/logs", (req, res) => {
  const { id } = req.params
  const { from, to, limit } = req.query
  console.log(id, from, to, limit)

  // buscar usuario
  findUserBy('_id', id)
    .then(userFound => {

      // si encontramos usuario
      if (userFound) {

        const userName = userFound.username

        // buscamos log:
        // definimos la consulta
        let query = {}
        if (typeof from !== 'undefined' && typeof to !== 'undefined' && typeof limit !== 'undefined' 
          && from !== '' && to !== '' && limit !== '') {
          query = {
            user_id: id,
            date: {
              $gt: from,
              $lt: to
            }
          }
        }

        // por defecto, sin parametros adicionales
        else {
          const limit = 0;
          query = {
            user_id: id
          }
        }

        // ejecutamos consulta
        Exercise
          .find(query)
          .limit(parseInt(limit))
          .exec((err, exercisesFound) => {
            const count = exercisesFound.length

            // encontramos log
            if (exercisesFound) {
              const log = []

              exercisesFound.map(exercise => {
                log.push({
                  description: exercise.description,
                  duration: exercise.duration,
                  date: (new Date(exercise.date)).toDateString(),
                })
              })

              // return json
              res.json({
                _id: id,
                username: userName,
                count: count,
                log: log
              })

              // no encontramos log
            } else {
              res.json({
                message: 'not found'
              })
            }

            if(err) res.json({ err: err.message })
          })
      }
      // si no existe usuario
      else {
        res.json({
          message: 'Unknown userId'
        })
      }

    })
    .catch(err => {
      res.json({ error: err.message })
    })

})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
