// Course Builder - النسخة النهائية الشغالة
console.log('🚀 بدء تحميل Course Builder...');

// متغيرات عامة
let currentCourseId = null;
let currentCourseData = {
    title: '',
    subtitle: '',
    description: '',
    modules: []
};

// التأكد من تحميل الصفحة
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// تهيئة التطبيق
function initializeApp() {
    console.log('🔧 تهيئة التطبيق...');
    
    // التحقق من Firebase
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase غير محمل!');
        setTimeout(initializeApp, 500);
        return;
    }
    
    // التحقق من الخدمات
    if (typeof auth === 'undefined' || typeof db === 'undefined') {
        console.error('❌ خدمات Firebase غير جاهزة!');
        setTimeout(initializeApp, 500);
        return;
    }
    
    console.log('✅ Firebase جاهز للعمل');
    
    // بدء العمل
    checkAuth();
    setupUI();
}

// التحقق من تسجيل الدخول
function checkAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ مسجل دخول:', user.email);
            loadCourseData();
        } else {
            console.log('❌ غير مسجل دخول');
            // السماح بالعمل بدون تسجيل دخول للتطوير
            loadCourseData();
        }
    });
}

// إعداد الواجهة
function setupUI() {
    // إزالة الوحدات الافتراضية
    const defaultModules = document.querySelectorAll('.chapter-item');
    defaultModules.forEach(module => {
        if (module.textContent.includes('فوم العطش الوجودي')) {
            module.remove();
        }
    });
    
    // ربط الأزرار
    setupButtons();
}

// ربط الأزرار
function setupButtons() {
    // زر حفظ الدورة
    const saveBtn = document.querySelector('button[onclick*="saveCourse"]');
    if (saveBtn) {
        saveBtn.onclick = saveCourseData;
    }
}

// تحميل بيانات الدورة
async function loadCourseData() {
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('id');
    
    if (courseId && courseId !== 'new') {
        currentCourseId = courseId;
        try {
            const doc = await db.collection('courses').doc(courseId).get();
            if (doc.exists) {
                currentCourseData = doc.data();
                console.log('✅ تم تحميل الدورة');
                updateUI();
            }
        } catch (error) {
            console.error('خطأ في التحميل:', error);
        }
    } else {
        console.log('📝 دورة جديدة');
        updateUI();
    }
}

// تحديث الواجهة
function updateUI() {
    // تحديث العنوان
    const titleInput = document.querySelector('input[value="ملاذ الحياري"]');
    if (titleInput && currentCourseData.title) {
        titleInput.value = currentCourseData.title;
    }
    
    // تحديث قائمة الوحدات
    updateModulesList();
}

// تحديث قائمة الوحدات
function updateModulesList() {
    const container = document.querySelector('.chapters-sidebar');
    if (!container) return;
    
    // البحث عن منطقة الوحدات
    let modulesArea = container.querySelector('.modules-list');
    if (!modulesArea) {
        // إنشاء منطقة للوحدات
        modulesArea = document.createElement('div');
        modulesArea.className = 'modules-list';
        
        // إضافتها قبل زر إضافة وحدة
        const addBtn = container.querySelector('button[onclick*="addModule"]');
        if (addBtn) {
            container.insertBefore(modulesArea, addBtn);
        } else {
            container.appendChild(modulesArea);
        }
    }
    
    // مسح المحتوى القديم
    modulesArea.innerHTML = '';
    
    // إضافة الوحدات
    if (currentCourseData.modules && currentCourseData.modules.length > 0) {
        currentCourseData.modules.forEach((module, index) => {
            const moduleEl = createModuleElement(module, index);
            modulesArea.appendChild(moduleEl);
        });
    }
}

// إنشاء عنصر الوحدة
function createModuleElement(module, index) {
    const div = document.createElement('div');
    div.className = 'chapter-item';
    div.innerHTML = `
        <div class="chapter-header">
            <div class="chapter-title">
                <span class="chapter-number">${index + 1}</span>
                <span>${module.title}</span>
            </div>
            <div class="chapter-actions">
                <button class="btn btn-icon btn-secondary" style="width: 30px; height: 30px;" onclick="editModule(${index})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-icon btn-secondary" style="width: 30px; height: 30px;" onclick="deleteModule(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="chapter-info">
            <span><i class="fas fa-video"></i> ${module.lessons ? module.lessons.length : 0} دروس</span>
            <span><i class="fas fa-clock"></i> ${module.duration || '0'} دقيقة</span>
        </div>
    `;
    return div;
}

// إضافة وحدة جديدة
window.addModule = function() {
    // إنشاء نافذة منبثقة بسيطة
    const modalHTML = `
        <div id="add-module-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 2rem; border-radius: 10px; min-width: 400px;">
                <h3 style="margin-bottom: 1rem;">إضافة وحدة جديدة</h3>
                <input type="text" id="module-title" placeholder="عنوان الوحدة" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 5px;">
                <textarea id="module-desc" placeholder="وصف الوحدة (اختياري)" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 5px; min-height: 80px;"></textarea>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="closeModuleModal()" style="padding: 0.5rem 1rem;">إلغاء</button>
                    <button onclick="saveNewModule()" style="padding: 0.5rem 1rem; background: #f4c430; border: none; border-radius: 5px;">حفظ</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('module-title').focus();
}

// حفظ الوحدة الجديدة
window.saveNewModule = function() {
    const title = document.getElementById('module-title').value.trim();
    const desc = document.getElementById('module-desc').value.trim();
    
    if (!title) {
        alert('من فضلك أدخل عنوان الوحدة');
        return;
    }
    
    // إضافة الوحدة
    if (!currentCourseData.modules) {
        currentCourseData.modules = [];
    }
    
    currentCourseData.modules.push({
        title: title,
        description: desc,
        lessons: [],
        duration: 0,
        createdAt: new Date()
    });
    
    // تحديث الواجهة
    updateModulesList();
    closeModuleModal();
    
    // حفظ تلقائي
    saveCourseData();
}

// إغلاق نافذة الوحدة
window.closeModuleModal = function() {
    const modal = document.getElementById('add-module-modal');
    if (modal) modal.remove();
}

// تعديل وحدة
window.editModule = function(index) {
    const module = currentCourseData.modules[index];
    
    // إنشاء نافذة التعديل
    const modalHTML = `
        <div id="edit-module-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;">
            <div style="background: white; padding: 2rem; border-radius: 10px; min-width: 400px;">
                <h3 style="margin-bottom: 1rem;">تعديل الوحدة</h3>
                <input type="text" id="edit-module-title" value="${module.title}" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 5px;">
                <textarea id="edit-module-desc" style="width: 100%; padding: 0.5rem; margin-bottom: 1rem; border: 1px solid #ddd; border-radius: 5px; min-height: 80px;">${module.description || ''}</textarea>
                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button onclick="closeEditModal()" style="padding: 0.5rem 1rem;">إلغاء</button>
                    <button onclick="saveEditModule(${index})" style="padding: 0.5rem 1rem; background: #f4c430; border: none; border-radius: 5px;">حفظ</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// حفظ تعديلات الوحدة
window.saveEditModule = function(index) {
    const title = document.getElementById('edit-module-title').value.trim();
    const desc = document.getElementById('edit-module-desc').value.trim();
    
    if (!title) {
        alert('من فضلك أدخل عنوان الوحدة');
        return;
    }
    
    // تحديث البيانات
    currentCourseData.modules[index].title = title;
    currentCourseData.modules[index].description = desc;
    
    // تحديث الواجهة
    updateModulesList();
    closeEditModal();
    
    // حفظ تلقائي
    saveCourseData();
}

// إغلاق نافذة التعديل
window.closeEditModal = function() {
    const modal = document.getElementById('edit-module-modal');
    if (modal) modal.remove();
}

// حذف وحدة
window.deleteModule = function(index) {
    if (confirm('هل أنت متأكد من حذف هذه الوحدة؟')) {
        currentCourseData.modules.splice(index, 1);
        updateModulesList();
        saveCourseData();
    }
}

// حفظ بيانات الدورة
async function saveCourseData() {
    try {
        console.log('💾 جاري الحفظ...');
        
        // جمع البيانات من الحقول
        const titleInput = document.querySelector('input[value*="ملاذ"]') || document.querySelector('input[name="title"]');
        if (titleInput) currentCourseData.title = titleInput.value;
        
        // التحقق من Firebase
        if (typeof db === 'undefined') {
            console.error('❌ Firebase غير جاهز');
            alert('عذراً، هناك مشكلة في الاتصال. حاول مرة أخرى.');
            return;
        }
        
        // إضافة بيانات التحديث
        currentCourseData.updatedAt = new Date();
        
        if (currentCourseId) {
            // تحديث دورة موجودة
            await db.collection('courses').doc(currentCourseId).set(currentCourseData);
        } else {
            // إنشاء دورة جديدة
            currentCourseData.createdAt = new Date();
            const docRef = await db.collection('courses').add(currentCourseData);
            currentCourseId = docRef.id;
            
            // تحديث URL
            window.history.replaceState({}, '', `?id=${currentCourseId}`);
        }
        
        console.log('✅ تم الحفظ بنجاح');
        showSuccessMessage();
        
    } catch (error) {
        console.error('❌ خطأ في الحفظ:', error);
        alert('حدث خطأ في الحفظ: ' + error.message);
    }
}

// إظهار رسالة النجاح
function showSuccessMessage() {
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #28a745;
        color: white;
        padding: 1rem 2rem;
        border-radius: 8px;
        font-weight: bold;
        z-index: 9999;
    `;
    msg.textContent = 'تم الحفظ بنجاح!';
    document.body.appendChild(msg);
    
    setTimeout(() => msg.remove(), 3000);
}

console.log('✅ Course Builder جاهز للعمل!');
