/*
 * نقاط الدروس عن طريق السيرفر — js/points-client.js
 *
 * نقاط المحفظة والرحلة بتاعة الدرس بتتحسب وتتسجل على السيرفر بس، ومرة واحدة لكل درس.
 * PointsServer.lesson(courseId, lessonIndex, contentId) → { points, already }
 * ما بيرميش أخطاء: لو حصلت مشكلة بيرجّع { points: 0, error } والدرس بيتسجل عادي.
 */
(function () {
  'use strict';

  var URL = 'https://us-central1-fouad-perspective.cloudfunctions.net/telegramBot/points/lesson';

  function lesson(courseId, lessonIndex, contentId) {
    var user = null;
    try { user = firebase.auth().currentUser; } catch (e) {}
    if (!user) return Promise.resolve({ points: 0, error: 'login' });
    return user.getIdToken().then(function (token) {
      return fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ courseId: String(courseId), lessonIndex: Number(lessonIndex), contentId: contentId || null })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; });
    }).then(function (j) {
      if (!j || !j.ok) return { points: 0, error: (j && j.error) || 'server' };
      return { points: Number(j.points) || 0, already: !!j.already };
    }, function () {
      return { points: 0, error: 'network' };
    });
  }

  // نقاط عمود في تمرين أو تأمل: السيرفر بياخد الرقم من إعدادات المحتوى في المكتبة، مرة واحدة
  function pillar(courseId, pillarKey, details) {
    details = details || {};
    var user = null;
    try { user = firebase.auth().currentUser; } catch (e) {}
    if (!user) return Promise.resolve({ points: 0, error: 'login' });
    return user.getIdToken().then(function (token) {
      return fetch(URL.replace('/points/lesson', '/points/pillar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({
          courseId: String(courseId), pillarKey: pillarKey, type: details.type || '',
          contentId: details.contentId || details.exerciseId || null,
          momentIndex: details.momentIndex == null ? null : Number(details.momentIndex)
        })
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; });
    }).then(function (j) {
      if (!j || !j.ok) return { points: 0, error: (j && j.error) || 'server' };
      return { points: Number(j.points) || 0, already: !!j.already };
    }, function () { return { points: 0, error: 'network' }; });
  }

  window.PointsServer = { lesson: lesson, pillar: pillar };
})();
