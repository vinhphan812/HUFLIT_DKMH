var request = require("request-promise"),
	cheerio = require("cheerio");

const API_SERVER = [
	"https://portal.huflit.edu.vn",
	"https://dkmh.huflit.edu.vn",
];

function makeURL(uri, params = {}, typeURL = 0) {
	let url = API_SERVER[typeURL] + uri;
	if (Object.keys(params).length == 0) return url;
	let paramsArr = [];
	for (var key in params) paramsArr.push(`${key}=${params[key]}`);
	return `${url}?${paramsArr.join("&")}`;
}
class APIHuflit {
	constructor() {
		this.jar = request.jar();
		request = request.defaults({
			resolveWithFullResponse: true,
			simple: false,
			headers: {
				accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
				"accept-language": "vi,en-US;q=0.9,en;q=0.8",
				"user-agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/84.0.4147.125 Safari/537.36 Edg/84.0.522.59",
			},
		});
	}

	requestServer(data = { URI, formData: "" }) {
		console.log(data.URI);

		let form = {
			uri: data.URI,
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
					URI: makeURL("/Login"),
					formData: {
						txtTaiKhoan: user,
						txtMatKhau: pass,
					},
				});

				const userName = $("a.stylecolor span").text();

				//? Check Login Success
				if (!userName.includes(user))
					return resolve({
						isDone: false,
						msg: "Wrong user or pass",
					});

				//? request get cookie DangKiHocPhan
				await this.requestServer({
					URI: makeURL("/Home/DangKyHocPhan"),
				});

				resolve({
					isDone: true,
					cookie: this.jar.getCookieString(API_SERVER[0]),
					name: userName,
				});
			} catch (err) {
				console.log(err);
				reject("server error");
			}
		});
	}
	GetDanhSachMonHoc() {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
					URI: makeURL(
						"/DangKyHocPhan/DanhSachHocPhan",
						{ typeId: "KH", id: "" },
						1
					),
				});
				const DSHP = $(
					"#DanhSachLop>table>tbody>tr:not(:first-child)"
				);
				let list = [];
				DSHP.each(function () {
					var mon = $(this).children("td");
					if (mon.length == 6) {
						const tenHP = $(this)
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
	GetMaLHP(data = { MaLT, MaTH: false, IdMon }) {
		return new Promise(async (resolve, reject) => {
			try {
				const $ = await this.requestServer({
					URI: makeURL(
						"/DangKyHocPhan/DanhSachLopHocPhan",
						{ id: data.Idmon, registType: "KH" },
						1
					),
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
						URI: makeURL(
							"/DangKyHocPhan/DangKy",
							{
								Hide: CodeMonStr,
								acceptConflict: acceptConflict,
								classStudyUnitConflictId: idLHP,
								RegistType: "KH",
							},
							1
						),
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
