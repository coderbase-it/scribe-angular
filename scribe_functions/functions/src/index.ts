import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp(functions.config().firebase);
const afs = admin.firestore();

exports.onPost = functions.firestore
  .document('posts/{postId}')
  .onCreate(event => {
    const post = event.data.data();
    const currentuid = post.uid;
    const pid = post.pid;
    const date = post.date;
    updateFollowerFeeds(currentuid, pid, date);
    updateTotalScribes(currentuid);
});

exports.onDelete = functions.firestore
  .document('posts/{postId}')
  .onDelete(event => {
    const deletedPost = event.data.previous.data();
    deleteFeedPosts(deletedPost.uid, deletedPost.pid);
  })

function deleteFeedPosts(postUser, pid) {
    afs.collection('users/' + postUser + '/followers').get()
    .then(snapshot => {
        snapshot.forEach(
            doc => {
                afs.doc('users/' + doc.id + '/feed/' + pid).delete()
                .then(() => {
                    console.log('Feed Post Deleted for user ', doc.id);
                })
                .catch(err => {
                    console.log('delete error', err);
                });
            });
    }).then(() => {
            afs.doc('users/' + postUser + '/feed/' + pid).delete()
            .then(() => {
                console.log('Feed Post Deleted for PostUser-', postUser);
            })
            .catch(err => {
                console.log('delete error', err);
            });
        })
    .catch(err => {
        console.log(err);
    });
    updateTotalScribes(postUser);
}

function updateFollowerFeeds(currentuid, pid, date) {
    afs.collection('users/' + currentuid + '/followers').get()
    .then((snapshot) => {
        snapshot.forEach((doc) => {
            const feed = {
                pid: pid,
                date: date,
            }
            afs.collection('users/' + doc.id + '/feed').doc(pid).set(feed)
            .catch((err) => {
                console.log(err);
            });
            afs.collection('users/' + currentuid + '/feed').doc(pid).set(feed)
            .catch((err) => {
                console.log(err);
            });
        })
    })
    .catch((err) => {
        console.log('Error updating feeds', err);
    });
}

function updateTotalScribes(uid) {
    afs.collection('posts').where('uid', '==', uid).get()
    .then(
        posts => {
            const scribes = posts.size;
            const data = {
                totalScribes: scribes
            }
            afs.doc('users/' + uid).update(data)
            .then(() => {
                console.log('totalScribes updated for user- ', uid);
            })
            .catch(
                (err) => {
                 console.log(err);
                });
        })
    .catch ((err) => {
        console.log(err);
    });
}
