import express from "express";
import _database from "../models";

const router = express.Router();
const User = _database.User;
const Lesson = _database.Lesson;

const createOrFindLessonTags = async (userLessons, transaction) => {
  let lessonTags = [];

  for (let i = 0; i < userLessons.length; i++) {
    let lesson = userLessons[i];
    let [lessonTag, created] = await Lesson.findOrCreate({
      where: {
        name: lesson,
      },
      defaults: {
        name: lesson,
      },
      transaction,
    });
    lessonTags.push(lessonTag);
  }

  return lessonTags;
};

router.post("/", async (req, res) => {
  let userInformation = req.body;
  let userLessons = userInformation.lessons;
  let transaction;

  try {
    transaction = await _database.sequelize.transaction();

    let newUser = await User.create(userInformation);
    let lessonTags = await createOrFindLessonTags(userLessons, transaction);

    if (lessonTags) {
      await newUser.setLessons(lessonTags, { transaction });
    }

    transaction.commit();

    res.status(200).send({ message: "User successfully created" });
  } catch (err) {
    transaction.rollback();

    if (err.name == "SequelizeValidationError") {
      res.status(400).send({ error: err.message });
    } else {
      console.log("Error " + err.stack);
      res.status(500).end();
    }
  }
});

const getUserEventsAndLessons = async (user) => {
  let userLessons = await user.getLessons();
  let userEvents = await user.getEvents();

  userLessons = userLessons.map((lesson) => {
    return lesson.name;
  });

  userEvents = userEvents.map((event) => {
    return {
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
    };
  });

  let returnedUser = {
    ...user.toJSON(),
    lessons: userLessons,
    events: userEvents,
  };

  return returnedUser;
};

router.get("/:email", async (req, res) => {
  let userEmail = req.params.email;
  try {
    let user = await User.findOne({
      where: {
        email: userEmail,
      },
      attributes: [
        "email",
        "role",
        "displayName",
        "photoURL",
        "phoneNumber",
        "gender",
        "about",
        "dob",
        "languages_known",
      ],
    });

    if (!user) throw new Error("User not found");
    let returnedUser = await getUserEventsAndLessons(user);

    res.send(returnedUser);
  } catch (err) {
    if (err.message == "User not found") {
      res.status(404).send({ error: err.message });
    } else {
      console.log(err.stack);
      res.status(500).end();
    }
  }
});

router.get("/", async (req, res) => {
  try {
    let users = await User.findAll({
      attributes: [
        "email",
        "role",
        "displayName",
        "photoURL",
        "phoneNumber",
        "gender",
        "about",
        "dob",
        "languages_known",
      ],
    });

    if (users.length === 0) throw new Error("Users not found");

    users = await Promise.all(
      users.map(async (user) => {
        let userInfo = await getUserEventsAndLessons(user);
        return userInfo;
      })
    );

    res.send(users);
  } catch (err) {
    if (err.message == "Users not found") {
      res.status(404).send({ error: err.message });
    } else {
      console.log(err.stack);
      res.status(500).end();
    }
  }
});

router.put("/:email", async (req, res) => {
  let userEmail = req.params.email;
  let userUpdatedInformation = req.body;
  let updatedLessons = userUpdatedInformation.lessons;
  let transaction;

  try {
    transaction = await _database.sequelize.transaction();
    let userToUpdate = await User.findOne({
      where: { email: userEmail },
      transaction,
    });

    await userToUpdate.update(userUpdatedInformation, { transaction });
    if (updatedLessons) {
      let lessonTags = await createOrFindLessonTags(
        updatedLessons,
        transaction
      );
      await userToUpdate.setLessons(lessonTags, { transaction });
    }
    await transaction.commit();

    res.send({ message: "Successfully updated" });
  } catch (err) {
    await transaction.rollback();

    if (err.name == "TypeError") {
      return res.status(404).json({ error: "User not found" });
    } else {
      console.log(err.stack);
      res.status(500).end();
    }
  }
});

export default router;
