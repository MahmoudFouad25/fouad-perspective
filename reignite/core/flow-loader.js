/* flow-loader.js — يحمّل ملف محتوى اليوم حسب ?day= في الرابط (الافتراضي يوم 1)
   ملاحظة: المسار نسبيّ لصفحات فولدر live/ فقط. */
(function(){
  var qs = new URLSearchParams(location.search);
  var day = qs.get('day');
  if(!day || !/^\d+$/.test(day)) day = '1';
  window.REIGNITE_DAY = day;
  document.write('<script src="../days/day' + day + '/flow.js"><\/script>');
})();
