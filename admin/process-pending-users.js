// معالج المستخدمين المعلقين
// يتم تشغيل هذا الملف عندما يسجل المستخدم دخوله لأول مرة

async function processPendingUser(email) {
    try {
        const db = firebase.firestore();
        
        // البحث عن المستخدم المعلق
        const pendingSnapshot = await db.collection('pendingUsers')
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .limit(1)
            .get();
        
        if (!pendingSnapshot.empty) {
            const pendingDoc = pendingSnapshot.docs[0];
            const pendingData = pendingDoc.data();
            const tempId = pendingData.tempId;
            
            // الحصول على UID الحقيقي للمستخدم
            const currentUser = firebase.auth().currentUser;
            if (currentUser && currentUser.email === email) {
                const realUserId = currentUser.uid;
                
                // إزالة الحقول المؤقتة
                delete pendingData.tempId;
                delete pendingData.password;
                delete pendingData.status;
                
                // نقل البيانات للمجموعة الرئيسية
                await db.collection('users').doc(realUserId).set({
                    ...pendingData,
                    uid: realUserId,
                    firstLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // حذف السجل المعلق
                await db.collection('pendingUsers').doc(tempId).delete();
                
                return {
                    success: true,
                    userData: pendingData
                };
            }
        }
        
        return {
            success: false,
            message: 'لم يتم العثور على بيانات معلقة'
        };
        
    } catch (error) {
        console.error('Error processing pending user:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

// دالة للتحقق من صلاحية الدورات بناءً على التاريخ
function checkEnrollmentValidity(enrollments) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return enrollments.map(enrollment => {
        const endDate = new Date(enrollment.endDate);
        endDate.setHours(23, 59, 59, 999);
        
        enrollment.isActive = endDate >= today;
        enrollment.daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
        
        return enrollment;
    });
}

// تصدير الدوال
window.pendingUsersProcessor = {
    processPendingUser,
    checkEnrollmentValidity
};
