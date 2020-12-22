var request = require("request-promise");
var cheerio = require("cheerio");

const API_SERVER = [
	"https://portal.huflit.edu.vn",
	"https://dkmh.huflit.edu.vn",
];

class APIHuflit {
	constructor() {
		this.jar = request.jar();

		request = request.defaults({
			resolveWithFullResponse: true,
			simple: false,
			headers: {
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 Edg/84.0.522.59",
				accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
				"accept-language": "vi,en-US;q=0.9,en;q=0.8",
			},
		});
	}
	requestServer(data = { URI, formData: "", type: 0, headers }) {
		let form = {
			uri: API_SERVER[data.type] + data.URI,
			jar: this.jar,
			method: typeof data.formData === "object" ? "post" : "get",
			formData: data.formData,
			transform: (body) => cheerio.load(body),
		};
		return request(form);
	}
	login({ user, pass }) {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
					URI: "/Login",
					formData: {
						txtTaiKhoan: user,
						txtMatKhau: pass,
					},
					type: 0,
				});
				await this.requestServer({
					URI: "/Home/DangKyHocPhan",
					type: 0,
				});
				if (
					$("a.stylecolor>span:nth-child(1)")
						.text()
						.indexOf(user) >= 0
				)
					resolve({
						isDone: true,
						cookie: this.jar.getCookieString(API_SERVER),
						name: $("a.stylecolor span").text(),
					});
				reject({ isDone: false, msg: "Wrong user or pass" });
			} catch (err) {
				reject("server error");
			}
		});
	}
	GetDanhSachMonHoc() {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
					URI: "/DangKyHocPhan/DanhSachHocPhan?typeId=KH&id=",
					type: 1,
				});
				const DSHP = $(
					"#DanhSachLop>table>tbody>tr:not(:first-child)"
				);
				let list = [];
				DSHP.each(function (i, e) {
					var mon = $(e).children("td");
					if (mon.length == 6) {
						const tenHP = $(e)
								.children("td:nth-child(3)")
								.text(),
							id = $("a", mon).attr().href.split("'")[1];
						list.push(new MonHoc(tenHP, id));
					}
				});
				resolve((this.listMon = list));
			} catch (error) {
				reject(error);
			}
		});
		function MonHoc(TenHP, idMon) {
			this.TenHP = TenHP;
			this.idMon = idMon;
		}
	}
	FindMaHP(MaLHP, IdMon) {
		return new Promise(async (resolve, reject) => {
			await GetMaLHP(IdMon, MaLHP);
		});
		// let ListClass = [];
		// for (var i = 0; i < MaLHP.length; i++) {
		// 	var ListLop = this.ListMaHP.find((item) => item.idMon === IdMon);
		// 	ListClass.push(
		// 		ListLop.ListLHP.find((item) => item.MaLHP == MaLHP[i])
		// 	);
		// }
		// return ListClass;
	}
	GetMaLHP(data = { MaLT, MaTH: false, IdMon }) {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
					URI: `/DangKyHocPhan/DanhSachLopHocPhan?id=${data.IdMon}&registType=KH`,
					type: 1,
				});
				const listEl = $(
					"form[name='Frm'] div.cn-study-unit>table>tbody>tr"
				);
				let CodeID = [];
				for (let i = 0; i < listEl.length; i++) {
					const LT = $(listEl[i]),
						CodeLT = $(LT).children("td:nth-child(3)").text(),
						IdLT = $("td:nth-child(1)>input", LT).attr().id;
					if (CodeLT === data.MaLT) {
						console.log("Mã lớp Lý Thuyết: " + CodeLT);
						CodeID.push(IdLT);
						if (data.MaTH) {
							let TH = $("table>tbody>tr", listEl[i + 1]);
							TH.each((i, e) => {
								let idTH = $(
										"td:nth-child(1)>input",
										e
									).attr().id,
									CodeTH = $(e)
										.children("td:nth-child(2)")
										.text();
								if (CodeTH === data.MaTH) {
									CodeID.push(idTH);
									console.log(
										"Mã lớp Thực Hành: " + CodeTH
									);
								}
							});
						}
						break;
					}
				}
				resolve(CodeID.join("|") + "|");
			} catch (error) {
				reject(error);
			}
		});
	}
	DKMH(CodeMonStr = "", idLHP = "", acceptConflict = false) {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
						URI: `/DangKyHocPhan/DangKy?Hide=${CodeMonStr}&acceptConflict=${acceptConflict}&classStudyUnitConflictId=${idLHP}&RegistType=HK`,
						type: 1,
					}),
					res = JSON.parse($("body").text());
				if (res.State) resolve(res.Msg);
				else resolve(await this.DKMH(CodeMonStr, res.Obj1, true));
			} catch (error) {
				reject(error);
			}
		});
	}
}

module.exports = APIHuflit;
