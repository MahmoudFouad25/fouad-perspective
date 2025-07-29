// Course Builder Firebase Integration - FINAL FIXED VERSION
console.log('🚀 تحميل Course Builder Firebase...');

// متغيرات عامة
let currentCourseId = null;
let currentCourseData = {
    title: '',
    subtitle: '',
    description: '',
    modules: []
};

// انتظار تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 الصفحة جاهزة');
    
    // تأخير قليل للتأكد من تحميل Firebase
    setTimeout(initializePage, 500);
});

// تهيئة الصفحة
function initializePage() {
    console.log('🔧 تهيئة الصفحة...');
    
    // التحقق من Firebase
    if (typeof firebase === 'undefined' || typeof db === 'undefined') {
        console.error('❌ Firebase غير محمل!');
        setTimeout(initializePage, 500); // أعد المحاولة
        return;
    }
    
    console.log('✅ Firebase جاهز');
    
    // ربط الأحداث
    setupEventListeners();
    
    // التحقق من تسجيل الدخول
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            console.log('✅ المستخدم مسجل:', user.email);
            loadCourseData();
        } else {
            console.log('❌ غير مسجل دخول');
            window.location.href = 'login.html';
        }
    });
}

// ربط الأحداث
function setupEventListeners() {
    console.log('🎯 ربط الأحداث...');
    
    // زر حفظ الدورة
    const saveBtn = document.querySelector('.btn-primary');
    if (saveBtn) {
        saveBtn.onclick = function(e) {
            e.preventDefault();
            saveCourse();
        };
    }
    
    // حفظ تلقائي عند تغيير الحقول
    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            saveCourseData();
        });
    });
}

// تحميل بيانات الدورة
function loadCourseData() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (courseId && courseId !== 'new') {
        currentCourseId = courseId;
        loadExistingCourse(courseId);
    } else {
        console.log('📝 دورة جديدة');
        initializeNewCourse();
    }
}

// تحميل دورة موجودة
async function loadExistingCourse(courseId) {
    try {
        const doc = await db.collection('courses').doc(courseId).get();
        if (doc.exists) {
            currentCourseData = doc.data();
            console.log('✅ تم تحميل الدورة');
            updateUI();
        } else {
            console.error('❌ الدورة غير موجودة');
            initializeNewCourse();
        }
    } catch (error) {
        console.error('❌ خطأ في التحميل:', error);
    }
}

// إنشاء دورة جديدة
function initializeNewCourse() {
    currentCourseData = {
        title: '',
        subtitle: '',
        description: '',
        modules: [],
        createdAt: new Date(),
        createdBy: firebase.auth().currentUser ? firebase.auth().currentUser.uid : null
    };
    updateUI();
}

// تحديث الواجهة
function updateUI() {
    console.log('🎨 تحديث الواجهة...');
    
    // تحديث الحقول
    const titleInput = document.querySelector('input[placeholder*="عنوان"]');
    if (titleInput) titleInput.value = currentCourseData.title || '';
    
    const subtitleInput = document.querySelector('input[placeholder*="عنوان فرعي"]');
    if (subtitleInput) subtitleInput.value = currentCourseData.subtitle || '';
    
    const descInput = document.querySelector('textarea[placeholder*="وصف"]');
    if (descInput) descInput.value = currentCourseData.description || '';
    
    // تحديث قائمة الوحدات
    updateModulesList();
}

// تحديث قائمة الوحدات
function updateModulesList() {
    const container = document.getElementById('modules-container');
    if (!container) {
        console.log('❌ لا يوجد حاوية للوحدات');
        return;
    }
    
    // مسح المحتوى الحالي
    container.innerHTML = '';
    
    // إضافة الوحدات
    if (currentCourseData.modules && currentCourseData.modules.length > 0) {
        currentCourseData.modules.forEach((module, index) => {
            container.innerHTML += createModuleHTML(module, index);
        });
    } else {
        container.innerHTML = '<p style="text-align: center; color: #666;">لا توجد وحدات بعد</p>';
    }
}

// إنشاء HTML للوحدة
function createModuleHTML(module, index) {
    return `
        <div class="module-item" style="background: #f5f5f5; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4>الوحدة ${index + 1}: ${module.title}</h4>
                <div>
                    <button onclick="editModuleByIndex(${index})" class="btn btn-sm btn-secondary">تعديل</button>
                    <button onclick="deleteModuleByIndex(${index})" class="btn btn-sm btn-danger">حذف</button>
                </div>
            </div>
            <p style="color: #666; margin-top: 0.5rem;">عدد الدروس: ${module.lessons ? module.lessons.length : 0}</p>
        </div>
    `;
}

// إضافة وحدة جديدة
window.addModule = function() {
    const title = prompt('أدخل عنوان الوحدة:');
    if (title && title.trim()) {
        if (!currentCourseData.modules) {
            currentCourseData.modules = [];
        }
        
        currentCourseData.modules.push({
            title: title.trim(),
            lessons: [],
            createdAt: new Date()
        });
        
        updateModulesList();
        saveCourseData();
    }
}

// تعديل وحدة
window.editModuleByIndex = function(index) {
    const module = currentCourseData.modules[index];
    const newTitle = prompt('تعديل عنوان الوحدة:', module.title);
    
    if (newTitle && newTitle.trim() && newTitle !== module.title) {
        module.title = newTitle.trim();
        updateModulesList();
        saveCourseData();
    }
}

// حذف وحدة
window.deleteModuleByIndex = function(index) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        currentCourseData.modules.splice(index, 1);
        updateModulesList();
        saveCourseData();
    }
}

// حفظ بيانات الدورة
async function saveCourseData() {
    // جمع البيانات من الحقول
    const titleInput = document.querySelector('input[placeholder*="عنوان"]');
    if (titleInput) currentCourseData.title = titleInput.value;
    
    const subtitleInput = document.querySelector('input[placeholder*="عنوان فرعي"]');
    if (subtitleInput) currentCourseData.subtitle = subtitleInput.value;
    
    const descInput = document.querySelector('textarea[placeholder*="وصف"]');
    if (descInput) currentCourseData.description = descInput.value;
    
    // لا نحفظ في Firebase إلا عند الضغط على زر الحفظ
    console.log('📝 البيانات جاهزة للحفظ');
}

// حفظ الدورة في Firebase
window.saveCourse = async function() {
    try {
        console.log('💾 جاري الحفظ...');
        
        // تحديث البيانات
        saveCourseData();
        
        // إضافة معلومات التحديث
        currentCourseData.updatedAt = new Date();
        currentCourseData.updatedBy = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;
        
        if (currentCourseId) {
            // تحديث دورة موجودة
            await db.collection('courses').doc(currentCourseId).set(currentCourseData);
            console.log('✅ تم تحديث الدورة');
        } else {
            // إنشاء دورة جديدة
            const docRef = await db.collection('courses').add(currentCourseData);
            currentCourseId = docRef.id;
            console.log('✅ تم إنشاء دورة جديدة:', currentCourseId);
            
            // تحديث URL
            window.history.replaceState({}, '', `?id=${currentCourseId}`);
        }
        
        // إظهار رسالة نجاح
        showMessage('تم حفظ الدورة بنجاح!', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في الحفظ:', error);
        showMessage('حدث خطأ في الحفظ: ' + error.message, 'error');
    }
}

// إظهار رسالة
function showMessage(message, type = 'info') {
    // إنشاء عنصر الرسالة
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 9999;
        animation: slideDown 0.3s ease;
    `;
    
    // تحديد اللون حسب النوع
    if (type === 'success') {
        alertDiv.style.background = '#28a745';
    } else if (type === 'error') {
        alertDiv.style.background = '#dc3545';
    } else {
        alertDiv.style.background = '#17a2b8';
    }
    
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);
    
    // إزالة الرسالة بعد 3 ثواني
    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// تهيئة عند التحميل
console.log('✅ Course Builder Firebase جاهز!');
