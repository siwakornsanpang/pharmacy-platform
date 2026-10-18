import Swal from 'sweetalert2';

export async function mutationOk(kind: 'save' | 'delete', reload?: () => void | Promise<void>) {
  await Swal.fire({
    icon: 'success',
    title: kind === 'delete' ? 'ลบสำเร็จ' : 'สำเร็จ',
    text: kind === 'delete' ? 'ข้อมูลถูกลบเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อย',
    timer: 1500,
    timerProgressBar: true,
    showConfirmButton: false,
  });
  await reload?.();
}

export async function mutationErr(text = 'ไม่สามารถทำรายการได้') {
  await Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text });
}
