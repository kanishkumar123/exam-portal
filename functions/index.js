import functions from "firebase-functions";
import admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// 📌 Create Auth user + Firestore profile
export const createUserViaAdmin = functions.https.onCall(
  async (data, context) => {
    const { email, password, role, applicationNumber, dob } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    // Only allow staff or admin
    const callerUID = context.auth.uid;
    const callerDoc = await db.doc(`users/${callerUID}`).get();
    const callerRole = callerDoc.data()?.role;

    if (!["staff", "admin"].includes(callerRole)) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "Only staff or admin can create users"
      );
    }

    try {
      // Create user in Firebase Auth
      const user = await admin.auth().createUser({
        email,
        password,
      });

      // Add Firestore profile
      await db.doc(`users/${user.uid}`).set({
        uid: user.uid,
        email,
        applicationNumber,
        role,
        dob,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { uid: user.uid, success: true };
    } catch (error) {
      console.error("Error creating user:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);

// 📌 Link student to an exam in registrations
export const registerStudentForExam = functions.https.onCall(
  async (data, context) => {
    const { examId, studentAppNo, studentId, DOB } = data;

    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const regId = `${examId}_${studentAppNo}`;

    try {
      await db.doc(`registrations/${regId}`).set({
        examId,
        studentAppNo,
        studentId,
        DOB,
        allowed: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error) {
      console.error("Registration error:", error);
      throw new functions.https.HttpsError("internal", error.message);
    }
  }
);
