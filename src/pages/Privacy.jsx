export default function Privacy() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f6f7fb_100%)] px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl rounded-3xl border border-black/5 bg-white p-6 shadow-[0_16px_50px_rgba(0,0,0,0.06)] md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6A6A6A]">Finapple</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.4px] text-black">개인정보 처리방침</h1>
        <p className="mt-2 text-sm text-[#686868]">시행일: 2026년 4월 8일</p>

        <section className="mt-8 space-y-5 text-sm leading-relaxed text-[#2D2D2D]">
          <p>Finapple은 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 서비스에서 처리하는 개인정보 항목 및 이용 목적을 안내합니다.</p>
          <p>수집 항목: 이메일, 닉네임, 서비스 이용 기록(학습/퀴즈 진행 상태), 결제 상태(프리미엄 여부) 등 서비스 제공에 필요한 최소한의 정보.</p>
          <p>수집 목적: 회원 식별, 로그인 및 계정 관리, 학습 진도 저장, 고객 문의 대응, 서비스 품질 개선.</p>
          <p>보유 기간: 회원 탈퇴 시 지체 없이 파기하되, 관련 법령에 따라 보관이 필요한 정보는 해당 기간 동안 별도 보관합니다.</p>
          <p>제3자 제공: 원칙적으로 이용자 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령상 의무가 있는 경우 예외가 적용될 수 있습니다.</p>
          <p>이용자는 개인정보 열람, 정정, 삭제, 처리정지 요청 등 법령이 보장하는 권리를 행사할 수 있습니다.</p>
          <p>서비스는 개인정보 보호를 위해 접근 통제, 암호화, 권한 관리 등 안전성 확보 조치를 적용하기 위해 노력합니다.</p>
          <p>본 처리방침이 변경되는 경우 서비스 내 공지 또는 별도 고지를 통해 안내합니다.</p>
        </section>
      </div>
    </main>
  );
}
