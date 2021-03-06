const DKMH = require("./modules/DKMH"),
	DK = new DKMH();
var readline = require("readline-sync");

(async () => {
	var user = await DK.login({
		user: "mssv",
		pass: "matkhau",
	});

	if (!user.isDone) return console.log(user);

	DS = await DK.GetDanhSachMonHoc().catch((err) => console.error(err)); // crawl idMon
	console.table(DS);
	console.log(user);

	//? Nhap id mon, ma LHP LyThuyet, ma LHP ThucHanh

	var IdMon = readline.question("Nhap Id Mon: "),
		MaLT = readline.question("Nhap Ma LHP Ly Thuyet: "),
		MaTH = readline.question(
			"Nhap Ma LHP Thuc Hanh(neu khong de trong): "
		),
		Comfirm = readline.question("Tiep Tuc Chon 1: ");

	if (Comfirm !== "1") return;

	var data = {
		MaLT: MaLT,
		IdMon: IdMon,
	};

	if (MaTH != "") data.MaTH = MaTH;

	const CodeMonStr = await DK.GetMaLHP(data);

	console.log(await DK.DKMH(CodeMonStr));
})();
