import React, { useEffect } from "react";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { saveAs } from "file-saver";
import Head from "next/head";
import axios from "axios";
import { useForm, useFieldArray } from "react-hook-form";
import { useState } from "react";
import { TextField } from "@mui/material";
import { NumericFormat, NumericFormatProps } from 'react-number-format';
import PropTypes from 'prop-types';
import { normalizeCepNumber, normalizeCnpjNumber, normalizePhoneNumber } from "../mask/mask";

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
    var doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: function() {
        return "";
    }
    });
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
    saveAs(out, `output.docx`);
    console.log("aaa2");
  });
};

interface CustomProps {
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
}

const NumericFormatCustom = React.forwardRef<NumericFormatProps, CustomProps>(function NumericFormatCustom(
  props,
  ref,
) {
  const { onChange, ...other } = props;

  return (
    <NumericFormat
      {...other}
      getInputRef={ref}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      valueIsNumericString
      decimalSeparator=","
      thousandSeparator="."
      decimalScale={2} fixedDecimalScale
      prefix="R$ "
    />
  );
});

NumericFormatCustom.propTypes = {
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};


function Home() {

  const { control, register, handleSubmit, watch, formState: { errors }, setValue, getValues } = useForm<any>({
    defaultValues: {
      produtos: [{
        descricao: "",
        valorUn: 0,
        quant: 0,
        total: 0,
      }]
    }
  });

  const phoneValue = watch("celular")
  const cnpjValue = watch("cnpj")
  const cepValue = watch("cep")

  useEffect(() => {
    setValue("celular", normalizePhoneNumber(phoneValue))
  }, [phoneValue])

  useEffect(() => {
    setValue("cnpj", normalizeCnpjNumber(cnpjValue))
  }, [cnpjValue])

  useEffect(() => {
    setValue("cep", normalizeCepNumber(cepValue))
  }, [cepValue])


  const { fields, append, remove, replace } = useFieldArray<any>({
    control,
    name: "produtos"
  });
  const [local, setLocal] = useState<any>(null)

  const onSubmit = data => {
    let total = 0;
    data.produtos.map((produto) => {
      const valorNumerico = (produto.total.replace(/[\D]/g, '') / 100).toFixed(2);
      produto.valorUn = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valorUn)
      total += +valorNumerico
    })
    const valorFormatado = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
    data.totalProds = valorFormatado;
    data.endereco = `${data.logradouro}, ${data.numero} CEP: ${data.cep} ${local.localidade} - ${local.uf}`;
    data.hoje = dataAtual;
    if(data.freteText.length>0){
      data = {
        ...data,
        frete:true,
      }
    }
    if(data.impostosText.length>0){
      data = {
        ...data,
        impostos:true,
      }
    }
    if(data.valorSinal.length>0){
      data = {
        ...data,
        banco:true,
      }
    }
    console.log(data)
    generateDocument(data)

  };

  async function getCep(cep) {
    if (cep.length <= 9) {
      try {
        const response = await axios.get("https://viacep.com.br/ws/" + cep + "/json/");
        console.log(response);
        setLocal(response.data);
        setValue("logradouro", response.data.logradouro)
        setValue("bairro", response.data.bairro)
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


        <div className="text-center">

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap justify-center flex-col items-center gap-y-5">
            
            <TextField type="number" label="Número do Pedido" {...register("numPed", { required: true })} className="mx-6 mb-2 p-2 w-full h-10 rounded-xl" variant="filled" />
            <TextField type="text" label="Forma de Pagamento" {...register("frmPgt", { required: true })} className="mx-6 mb-2 p-2 w-full  h-10 rounded-xl" variant="filled" />

            <TextField type="text" label="Nome do Cliente" {...register("nomeCliente", { required: true, min: 15, maxLength: 80 })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />
            
            <TextField type="text" label="CNPJ" {...register("cnpj", { required: true, min: 8, maxLength: 18 })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField type="text" label="Celular" {...register("celular", { required: true, min: 8, maxLength: 15 })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField type="text" label="CEP" {...register("cep", { required: true, min: 8, maxLength: 9 })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" onBlur={(e) => getCep(e.target.value)} variant="filled">
            </TextField>

            <TextField type="text" label="Logradouro" {...register("logradouro", { required: true })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField type="text" label="Bairro" {...register("bairro", { required: true })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />
            <TextField type="text" label="Número" {...register("numero", { required: true })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField rows={4} label="Informações" {...register("info", {})} className="mt-4 w-full rounded-xl" variant="filled" placeholder="PRODUTO SERA FATURADO SOMENTE APOS A CONFIRMAÇÃO DO SINAL" multiline />
            <TextField rows={4} label="Condições de Pagamento" {...register("condPagamento", {})} className="w-full rounded-xl" variant="filled" multiline />

            
            <TextField type="text" label="Frete" {...register("freteText", { required: false })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField type="text" label="Impostos" {...register("impostosText", { required: false })} className="mb-2 mx-2 p-2 w-full h-10 rounded-xl" variant="filled" />

            <TextField
                    label="Valor Sinal"
                    {...register("valorSinal", { required: false })}
                    className="mb-8 mx-2 p-2 w-full h-10 rounded-xl"
                    name="valorSinal"
                    id="formatted-numberformat-input2"
                    InputProps={{
                      inputComponent: NumericFormatCustom as any,
                    }}
                    variant="filled"
                  />


            {fields.map((field, index) => {
              const produtos = watch("produtos")

              const handleChange = (event) => {
                if (event.target.name === 'valorUn') {
                  setValue(`produtos.${index}.valorUn`, event.target.value);
                  const quant = getValues(`produtos.${index}.quant`)
                  const valor = event.target.value
                  console.log(produtos[index]);
                  setValue(`produtos.${index}.total`, (quant * valor).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }))
                }
                if (event.target.name === 'quant') {
                  setValue(`produtos.${index}.quant`, event.target.value);
                  const quant = event.target.value
                  const valor = getValues(`produtos.${index}.valorUn`)
                  console.log(valor);
                  setValue(`produtos.${index}.total`, (quant * valor).toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }))
                }
              };
              return (
                <div className="w-full flex justify-center flex-col items-center border-2 border-r-gray-500 m-2 gap-4" key={field.id}>

                  <TextField
                    label="Descrição do Produto"
                    {...register(`produtos.${index}.descricao`)}
                    className="mb-8 mx-2 p-2 w-full h-10 rounded-xl"
                    variant="filled"
                  />

                  <TextField
                    label="Quantidade"
                    {...register(`produtos.${index}.quant` as const)}
                    className="mb-8 mx-2 p-2 w-full h-10 rounded-xl"
                    onChange={handleChange}
                    name="quant"
                    variant="filled"
                    type="number"
                  />

                  <TextField
                    label="Valor Unitário do Produto"
                    {...register(`produtos.${index}.valorUn`)}
                    className="mb-8 mx-2 p-2 w-full h-10 rounded-xl"
                    onChange={handleChange}
                    name="valorUn"
                    id="formatted-numberformat-input"
                    InputProps={{
                      inputComponent: NumericFormatCustom as any,
                    }}
                    variant="filled"
                  />

                  <TextField
                    label="Total"
                    disabled
                    {...register(`produtos.${index}.total`)}
                    className="mb-2 mx-2 p-2 w-full h-10 rounded-xl"
                    variant="filled"
                  />

                  <div>
                    {fields.length !== 1 && <button className="mt-5"
                      onClick={() => remove(index)}><svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g id="Edit / Remove_Minus_Circle">
                          <path id="Vector" d="M8 12H16M12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21Z" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                      </svg></button>}

                    {fields.length - 1 === index && <button className="mt-5" onClick={() => append({ descricao: '', quant: 0, valorUn: 0, total: 0 })}><svg width="40px" height="40px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
