import React from "react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import Head from "next/head";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { useState } from "react";

const path = require("path");

let PizZipUtils = null;
if (typeof window !== "undefined") {
  import("pizzip/utils/index.js").then(function (r) {
    PizZipUtils = r;
  });
}

function loadFile(url, callback) {
  PizZipUtils.getBinaryContent(url, callback);
}
var data = new Date();
var dia = String(data.getDate()).padStart(2, "0");
var mes = String(data.getMonth() + 1).padStart(2, "0");
var ano = data.getFullYear();
var dataAtual = dia + "/" + mes + "/" + ano;

// type Inputs = {
//   nomeCliente: string,
//   cnpj: string,
//   endereco: string,
//   celular: string,
//   cep: string,
//   logradouro: string,
//   bairro: string,
//   localidade: string,
//   uf: string,
//   numero: string,
//   produtos?: [
//     {
//       descricao: string,
//       valorUn: number,
//       quant: number,
//       total: number,
//     }
//   ],
//   totalProds: number,
//   frmPgt: string,
//   info: string,
//   obs: string,
//   numPed: string,
// };

// const conteudo = path.resolve("renderer", "template", "template.docx")
const conteudo = "/template/template.docx"


const generateDocument = (dados) => {
  loadFile(conteudo, function (
    error,
    content
  ) {
    if (error) {
      throw error;
    }
    console.log(content);
    var zip = new PizZip(content);
    var doc = new Docxtemplater(zip, { linebreaks: true });
    // var doc = new Docxtemplater().loadZip(zip);
    console.log(dados);
    doc.setData(dados);
    try {
      // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
      doc.render();
    } catch (error) {
      // The error thrown here contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
      const replaceErrors = function (key, value): Object {
        if (value instanceof Error) {
          return Object.getOwnPropertyNames(value).reduce(function (
            error,
            key
          ) {
            error[key] = value[key];
            return error;
          },
            {});
        }
        return value;
      }
      console.log(JSON.stringify({ error: error }, replaceErrors));

      if (error.properties && error.properties.errors instanceof Array) {
        const errorMessages = error.properties.errors
          .map(function (error) {
            return error.properties.explanation;
          })
          .join("\n");
        console.log("errorMessages", errorMessages);
      }
      throw error;
    }
    console.log("aaa");
    var out = doc.getZip().generate({
      type: "blob",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });
    // Output the document using Data-URI
    saveAs(out, "output.docx");
    console.log("aaa2");
  });
};

function Home() {

  const { control, register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm<any>({
    defaultValues: {
      produtos: [{
        descricao: "",
        valorUn: null,
        quant: null,
        total: null,
      }]
    }
  });
  const { fields, append, remove } = useFieldArray<any>({
    control,
    name: "produtos"
  });
  const [local, setLocal] = useState<any>(null)

  const onSubmit = data => {
    let total = 0;
    data.produtos.map((produto) => {
      total += +produto.total
    })
    data.totalProds = total;
    data.endereco = `${data.logradouro}, ${data.numero} CEP: ${data.cep} ${local.localidade} - ${local.uf}`;
    data.hoje = dataAtual;
    generateDocument(data)
  };

  async function getCep(cep) {
    if (cep.length == 8) {
      try {
        const response = await axios.get("https://viacep.com.br/ws/" + cep + "/json/");
        console.log(response);
        setLocal(response.data);
        setValue("logradouro", response.data.logradouro)
        setValue("bairro", response.data.bairro)
        setValue("localidade", response.data.localidade)
        setValue("uf", response.data.uf)
      } catch (error) {
        console.error(error);
      }
    } else {
      throw console.error("CEP Inválido");
    }

  }
  return (
    <>
      <Head>
        <title>Pedidos Enterpostos</title>
      </Head>
      <div className="mt-8 max-w-full mx-auto px-8">
        <div className="flex flex-col justify-center items-center">
          <img src="/images/logo enterpostos.png" className="h-50 w-80" />
          <span className="block text-5xl font-bold leading-none m-2">
            Formulário de Pedidos
          </span>
        </div>


        <div className="mt-12 text-center">

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap justify-center flex-col items-center">

            <div className="w-full">
              <label htmlFor="">Número do Pedido</label>
              <input type="number" placeholder="Número do Pedido" {...register("numPed", { required: true })} className="mx-6 mb-2 p-2 w-1/10 h-10 rounded-xl" />
              <input type="text" placeholder="Forma de Pagamento" {...register("frmPgt", { required: true })} className="mx-6 mb-2 p-2 w-1/6 h-10 rounded-xl" />
            </div>

            <div className="w-full">
              <input type="text" placeholder="Nome do Cliente" {...register("nomeCliente", { required: true, min: 15, maxLength: 80 })} className="mb-2 mx-2 p-2 w-1/4 h-10 rounded-xl" />
              <input type="text" placeholder="CNPJ" {...register("cnpj", { required: true, min: 14 })} className="mb-2 mx-2 p-2 w-2/10 h-10 rounded-xl" />
            </div>

            <div className="w-full">
              <input type="text" placeholder="Celular" {...register("celular", { required: true, min: 8, maxLength: 12 })} className="mb-2 mx-2 p-2 w-1/12 h-10 rounded-xl" />
              <input type="text" placeholder="CEP" {...register("cep", { required: true, min: 8, maxLength: 8 })} className="mb-2 mx-2 p-2 w-1/12 h-10 rounded-xl" onBlur={(e) => getCep(e.target.value)} />
              <input type="text" placeholder="Logradouro" {...register("logradouro", { required: true })} className="mb-2 mx-2 p-2 w-1/4 h-10 rounded-xl" />
            </div>

            <div className="w-full">
              <input type="text" placeholder="Bairro" {...register("bairro", { required: true })} className="mb-2 mx-2 p-2 w-1/4 h-10 rounded-xl" />
              <input type="text" placeholder="Número" {...register("numero", { required: true })} className="mb-2 mx-2 p-2 w-1/12 h-10 rounded-xl" />
            </div>

            <textarea rows={8} placeholder="Informações" {...register("info", {})} className="mb-2 p-2 w-full rounded-xl" />
            <textarea rows={8} placeholder="Observações" {...register("obs", {})} className="mb-2 p-2 w-full rounded-xl" />

            {fields.map((field, index) => {
              return (
                <div className="w-full flex justify-center flex-col items-center border-2 border-r-gray-500 m-2" key={field.id}>

                  <input
                    placeholder="Descrição do Produto"
                    {...register(`produtos.${index}.descricao`)}
                    className="mb-2 mx-2 p-2 w-1/2 h-10 rounded-xl"
                  />

                  <input
                    placeholder="Quantidade"
                    {...register(`produtos.${index}.quant` as const)}
                    className="mb-2 mx-2 p-2 w-1/2 h-10 rounded-xl"
                  />

                  <input
                    placeholder="Valor Unitário do Produto"
                    {...register(`produtos.${index}.valorUn`)}
                    className="mb-2 mx-2 p-2 w-1/2 h-10 rounded-xl"
                    onChange={() => console.log(getValues(`produtos.${index}.quant`))}
                  />

                  <input
                    placeholder="Total"
                    {...register(`produtos.${index}.total`)}
                    onFocus={() => {
                      let quant = getValues(`produtos.${index}.quant`);
                      let valor = getValues(`produtos.${index}.valorUn`);
                      setValue(`produtos.${index}.total`, quant * valor)
                    }}
                    className="mb-2 mx-2 p-2 w-1/2 h-10 rounded-xl"
                  />

                  <div>
                    {fields.length !== 1 && <button
                      onClick={() => remove(index)}><svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="Edit / Remove_Minus_Circle">
                          <path id="Vector" d="M8 12H16M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      </svg></button>}

                    {fields.length - 1 === index && <button onClick={() => append({ descricao: '', quant: null, valorUn: null, total: null })}><svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 12L12 12M12 12L17 12M12 12V7M12 12L12 17" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="9" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg></button>}

                  </div>

                </div>
              )
            })}

            <div className="m-5 text-center">
              <button
                className="inline-block bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg px-6 py-4 leading-tight"
              >
                Gerar Pedido
              </button>
            </div>
          </form>

        </div>
      </div>
    </>
  );

}
export default Home;
