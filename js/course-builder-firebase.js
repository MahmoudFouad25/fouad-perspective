// Course Builder Firebase Integration - FIXED VERSION
console.log('🚀 تحميل Course Builder Firebase...');

// تأكد من تحميل Firebase أولاً
if (typeof firebase === 'undefined') {
    console.error('❌ Firebase غير محمل! تأكد من تحميل firebase-config.js أولاً');
}

// متغيرات عامة
let currentCourseId = null;
let currentCourseData = {
    title: '',
    subtitle: '',
    description: '',
    modules: []
};

// تحميل بيانات الدورة عند فتح الصفحة
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 تحميل الصفحة...');
    
    // التحقق من Firebase
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error('❌ Firebase غير مهيأ بشكل صحيح');
        return;
    }
    
    // التحقق من تسجيل الدخول
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            console.log('❌ المستخدم غير مسجل الدخول');
            window.location.href = 'login.html';
            return;
        }
        
        console.log('✅ المستخدم مسجل:', user.email);
        
        // الحصول على معرف الدورة من URL
        const urlParams = new URLSearchParams(window.location.search);
        const courseId = urlParams.get('id');
        
        if (courseId && courseId !== 'new') {
            currentCourseId = courseId;
            await loadCourse(courseId);
        } else {
            console.log('📝 إنشاء دورة جديدة');
            initializeEmptyForm();
        }
    });
});

// تحميل بيانات الدورة
async function loadCourse(courseId) {
    try {
        console.log('📥 تحميل الدورة:', courseId);
        const doc = await db.collection('courses').doc(courseId).get();
        
        if (doc.exists) {
            currentCourseData = doc.data();
            console.log('✅ تم تحميل بيانات الدورة');
            updateUI();
        } else {
            console.error('❌ الدورة غير موجودة');
            alert('الدورة المطلوبة غير موجودة');
            window.location.href = 'dashboard.html';
        }
    } catch (error) {
        console.error('❌ خطأ في تحميل الدورة:', error);
    }
}

// تهيئة نموذج فارغ
function initializeEmptyForm() {
    currentCourseData = {
        title: '',
        subtitle: '',
        description: '',
        modules: []
    };
    updateUI();
}

// تحديث واجهة المستخدم
function updateUI() {
    console.log('🎨 تحديث الواجهة...');
    
    // تحديث حقول النموذج
    const titleInput = document.querySelector('input[name="title"]');
    if (titleInput) titleInput.value = currentCourseData.title || '';
    
    const subtitleInput = document.querySelector('input[name="subtitle"]');
    if (subtitleInput) subtitleInput.value = currentCourseData.subtitle || '';
    
    const descriptionInput = document.querySelector('textarea[name="description"]');
    if (descriptionInput) descriptionInput.value = currentCourseData.description || '';
    
    // تحديث المنهج
    updateModulesList();
}

// تحديث قائمة الوحدات
function updateModulesList() {
    const container = document.getElementById('modules-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (currentCourseData.modules && currentCourseData.modules.length > 0) {
        currentCourseData.modules.forEach((module, index) => {
            const moduleElement = createModuleElement(module, index);
            container.appendChild(moduleElement);
        });
    }
}

// إنشاء عنصر الوحدة
function createModuleElement(module, index) {
    const div = document.createElement('div');
    div.className = 'module-item';
    div.innerHTML = `
        <div class="module-header">
            <h4>الوحدة ${index + 1}: ${module.title}</h4>
            <div class="module-actions">
                <button onclick="editModule(${index})" class="btn-edit">تعديل</button>
                <button onclick="deleteModule(${index})" class="btn-delete">حذف</button>
            </div>
        </div>
        <div class="module-content">
            <p>عدد الدروس: ${module.lessons ? module.lessons.length : 0}</p>
        </div>
    `;
    return div;
}

// إضافة وحدة جديدة - بنافذة أفضل
window.addModule = function() {
    const modal = document.getElementById('module-modal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('module-title-input').value = '';
        document.getElementById('module-save-btn').onclick = saveNewModule;
    } else {
        // إذا لم توجد نافذة، استخدم prompt
        const title = prompt('أدخل اسم الوحدة:');
        if (title) {
            currentCourseData.modules = currentCourseData.modules || [];
            currentCourseData.modules.push({
                title: title,
                lessons: []
            });
            updateModulesList();
            saveCourse();
        }
    }
}

// حفظ الوحدة الجديدة
function saveNewModule() {
    const titleInput = document.getElementById('module-title-input');
    const title = titleInput.value.trim();
    
    if (title) {
        currentCourseData.modules = currentCourseData.modules || [];
        currentCourseData.modules.push({
            title: title,
            lessons: []
        });
        updateModulesList();
        saveCourse();
        closeModal('module-modal');
    }
}

// تعديل وحدة
window.editModule = function(index) {
    const module = currentCourseData.modules[index];
    const newTitle = prompt('تعديل اسم الوحدة:', module.title);
    
    if (newTitle && newTitle !== module.title) {
        module.title = newTitle;
        updateModulesList();
        saveCourse();
    }
}

// حذف وحدة
window.deleteModule = function(index) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        currentCourseData.modules.splice(index, 1);
        updateModulesList();
        saveCourse();
    }
}

// حفظ الدورة
async function saveCourse() {
    try {
        console.log('💾 حفظ الدورة...');
        
        // جمع البيانات من النموذج
        const titleInput = document.querySelector('input[name="title"]');
        if (titleInput) currentCourseData.title = titleInput.value;
        
        const subtitleInput = document.querySelector('input[name="subtitle"]');
        if (subtitleInput) currentCourseData.subtitle = subtitleInput.value;
        
        const descriptionInput = document.querySelector('textarea[name="description"]');
        if (descriptionInput) currentCourseData.description = descriptionInput.value;
        
        // إضافة بيانات إضافية
        currentCourseData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        currentCourseData.updatedBy = auth.currentUser.uid;
        
        if (currentCourseId) {
            // تحديث دورة موجودة
            await db.collection('courses').doc(currentCourseId).update(currentCourseData);
            console.log('✅ تم تحديث الدورة');
        } else {
            // إنشاء دورة جديدة
            currentCourseData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            currentCourseData.createdBy = auth.currentUser.uid;
            
            const docRef = await db.collection('courses').add(currentCourseData);
            currentCourseId = docRef.id;
            console.log('✅ تم إنشاء دورة جديدة:', currentCourseId);
            
            // تحديث URL
            window.history.replaceState({}, '', `?id=${currentCourseId}`);
        }
        
        showSuccessMessage('تم حفظ التغييرات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في حفظ الدورة:', error);
        alert('حدث خطأ في حفظ البيانات');
    }
}

// إظهار رسالة نجاح
function showSuccessMessage(message) {
    const messageEl = document.getElementById('success-message') || createSuccessMessage();
    messageEl.textContent = message;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

// إنشاء عنصر رسالة النجاح
function createSuccessMessage() {
    const messageEl = document.createElement('div');
    messageEl.id = 'success-message';
    messageEl.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(messageEl);
    return messageEl;
}

// إغلاق النافذة المنبثقة
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// ربط زر الحفظ
document.addEventListener('DOMContentLoaded', () => {
    const saveBtn = document.getElementById('save-course-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveCourse);
    }
});

console.log('✅ Course Builder Firebase جاهز!');
